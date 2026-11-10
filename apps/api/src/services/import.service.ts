import { Client as SftpClient } from 'ssh2';
import * as ftp from 'basic-ftp';
import fs from 'fs';
import path from 'path';
import { dockerService } from './docker.service';
import { prisma } from '../prisma';

export interface ImportOptions {
  serviceId: string;
  serverType: 'SFTP' | 'FTP';
  host: string;
  port: number;
  username: string;
  password: string;
  baseDirectory?: string;
  deleteFiles?: boolean;
}

export function parseRemoteHost(rawHost: string, fallbackPort = 2022): { host: string; port: number } {
  let host = (rawHost || '').trim();
  // Strip protocol prefixes (e.g. sftp://, ftp://, ssh://)
  host = host.replace(/^[a-z0-9]+:\/\//i, '');
  // Strip any trailing path or slash
  host = host.replace(/\/.*$/, '').trim();

  let port = fallbackPort;
  if (host.includes(':')) {
    const parts = host.split(':');
    host = parts[0].trim();
    const parsed = parseInt(parts[1], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 65535) {
      port = parsed;
    }
  }

  return { host, port };
}

export interface ImportJobState {
  serviceId: string;
  status: 'PENDING' | 'CONNECTING' | 'TRANSFERRING' | 'COMPLETED' | 'FAILED';
  serverType: 'SFTP' | 'FTP';
  host: string;
  port: number;
  username: string;
  baseDirectory: string;
  deleteFiles: boolean;
  totalFiles: number;
  transferredFiles: number;
  currentFile: string;
  bytesTransferred: number;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

class ImportService {
  private activeJobs = new Map<string, ImportJobState>();

  getJob(serviceId: string): ImportJobState | undefined {
    return this.activeJobs.get(serviceId);
  }

  async startImport(options: ImportOptions, onLog?: (msg: string) => void): Promise<ImportJobState> {
    const serviceId = options.serviceId;
    const baseDir = (options.baseDirectory || '/').trim() || '/';
    const hostDataPath = `/var/lib/panelmaster/volumes/${serviceId}`;

    // Clean and sanitize host / port (e.g. if user pasted "sftp://rosalie.bloom.host:2022")
    const fallbackPort = options.serverType === 'SFTP' ? 2022 : 21;
    const parsed = parseRemoteHost(options.host, options.port || fallbackPort);
    options.host = parsed.host;
    options.port = parsed.port;

    const job: ImportJobState = {
      serviceId,
      status: 'CONNECTING',
      serverType: options.serverType,
      host: options.host,
      port: options.port,
      username: options.username.trim(),
      baseDirectory: baseDir,
      deleteFiles: !!options.deleteFiles,
      totalFiles: 0,
      transferredFiles: 0,
      currentFile: '',
      bytesTransferred: 0,
      startedAt: new Date().toISOString(),
    };

    this.activeJobs.set(serviceId, job);

    // Run import asynchronously
    this.runImportProcess(options, job, hostDataPath, onLog).catch((err) => {
      job.status = 'FAILED';
      job.error = err.message || 'Error desconocido durante la importación';
      onLog?.(`\x1b[31m[Import Error] ${job.error}\x1b[0m\r\n`);
    });

    return job;
  }

  private async runImportProcess(
    options: ImportOptions,
    job: ImportJobState,
    targetLocalDir: string,
    onLog?: (msg: string) => void
  ) {
    onLog?.(`\x1b[36m[PanelMaster Import]\x1b[0m Iniciando migración desde ${options.serverType}://${options.username}@${options.host}:${options.port}...\r\n`);

    // Ensure local directory exists
    if (!fs.existsSync(targetLocalDir)) {
      fs.mkdirSync(targetLocalDir, { recursive: true });
    }

    // 1. Wipe local files if deleteFiles is selected
    if (options.deleteFiles) {
      onLog?.(`\x1b[33m[PanelMaster Import]\x1b[0m Limpiando archivos locales existentes...\r\n`);
      try {
        const existing = fs.readdirSync(targetLocalDir);
        for (const item of existing) {
          const p = path.join(targetLocalDir, item);
          fs.rmSync(p, { recursive: true, force: true });
        }
      } catch (err: any) {
        onLog?.(`\x1b[33m[PanelMaster Import]\x1b[0m Aviso al limpiar archivos: ${err.message}\r\n`);
      }
    }

    job.status = 'TRANSFERRING';

    if (options.serverType === 'SFTP') {
      await this.runSftpImport(options, job, targetLocalDir, onLog);
    } else {
      await this.runFtpImport(options, job, targetLocalDir, onLog);
    }

    job.status = 'COMPLETED';
    job.completedAt = new Date().toISOString();
    onLog?.(`\r\n\x1b[32m[PanelMaster Import] ✔ Migración completada con éxito. ${job.transferredFiles} archivos transferidos (${(job.bytesTransferred / (1024 * 1024)).toFixed(2)} MB).\x1b[0m\r\n`);

    // Auto-detect server jar and configuration
    this.autoDetectAndConfigureServer(options.serviceId, targetLocalDir, onLog);
  }

  private async runSftpImport(
    options: ImportOptions,
    job: ImportJobState,
    targetLocalDir: string,
    onLog?: (msg: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const conn = new SftpClient();

      conn.on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) {
            conn.end();
            return reject(err);
          }

          const remoteBase = options.baseDirectory && options.baseDirectory.startsWith('/')
            ? options.baseDirectory
            : `/${options.baseDirectory || ''}`;

          this.sftpDownloadRecursive(sftp, remoteBase, targetLocalDir, job, onLog)
            .then(() => {
              conn.end();
              resolve();
            })
            .catch((downErr) => {
              conn.end();
              reject(downErr);
            });
        });
      });

      conn.on('error', (err) => {
        reject(new Error(`Fallo de conexión SFTP: ${err.message}`));
      });

      conn.connect({
        host: options.host,
        port: options.port || 2022,
        username: options.username,
        password: options.password,
        readyTimeout: 20000,
        algorithms: {
          serverHostKey: [
            'ssh-ed25519',
            'ecdsa-sha2-nistp256',
            'ecdsa-sha2-nistp384',
            'ecdsa-sha2-nistp521',
            'rsa-sha2-512',
            'rsa-sha2-256',
            'ssh-rsa',
          ],
        },
      });
    });
  }

  private async sftpDownloadRecursive(
    sftp: any,
    remoteDir: string,
    localDir: string,
    job: ImportJobState,
    onLog?: (msg: string) => void
  ): Promise<void> {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }

    const items = await new Promise<any[]>((resolve, reject) => {
      sftp.readdir(remoteDir, (err: any, list: any[]) => {
        if (err) reject(err);
        else resolve(list || []);
      });
    });

    for (const item of items) {
      if (item.filename === '.' || item.filename === '..') continue;
      const remoteItemPath = path.posix.join(remoteDir, item.filename);
      const localItemPath = path.join(localDir, item.filename);

      const isDir = (item.attrs.mode & 0o170000) === 0o040000;
      if (isDir) {
        await this.sftpDownloadRecursive(sftp, remoteItemPath, localItemPath, job, onLog);
      } else {
        job.currentFile = item.filename;
        job.transferredFiles++;
        const size = item.attrs.size || 0;
        job.bytesTransferred += size;

        onLog?.(`[SFTP] Descargando: ${item.filename} (${(size / 1024).toFixed(1)} KB)\r\n`);

        await new Promise<void>((res, rej) => {
          sftp.fastGet(remoteItemPath, localItemPath, (getErr: any) => {
            if (getErr) rej(getErr);
            else res();
          });
        });
      }
    }
  }

  private async runFtpImport(
    options: ImportOptions,
    job: ImportJobState,
    targetLocalDir: string,
    onLog?: (msg: string) => void
  ): Promise<void> {
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      await client.access({
        host: options.host,
        port: options.port || 21,
        user: options.username,
        password: options.password,
        secure: false,
      });

      const remoteDir = options.baseDirectory || '/';
      await client.cd(remoteDir);

      client.trackProgress((info) => {
        job.bytesTransferred = info.bytes;
        job.currentFile = info.name;
        onLog?.(`[FTP] Descargando: ${info.name} (${(info.bytes / (1024 * 1024)).toFixed(1)} MB transferidos)\r\n`);
      });

      await client.downloadToDir(targetLocalDir);
      job.transferredFiles = fs.readdirSync(targetLocalDir).length;
    } finally {
      client.close();
    }
  }

  private autoDetectAndConfigureServer(serviceId: string, localDir: string, onLog?: (msg: string) => void) {
    try {
      const files = fs.readdirSync(localDir);
      const prevConfig = dockerService.getServerConfig(serviceId);

      let detectedJar = '';
      let detectedFork = prevConfig.fork || 'Paper';
      let detectedJava = prevConfig.java || 17;

      const jarCandidates = files.filter((f) => f.endsWith('.jar'));
      if (jarCandidates.length > 0) {
        // Find best server jar candidate
        const paperJar = jarCandidates.find((f) => f.toLowerCase().includes('paper'));
        const purpurJar = jarCandidates.find((f) => f.toLowerCase().includes('purpur'));
        const fabricJar = jarCandidates.find((f) => f.toLowerCase().includes('fabric'));
        const forgeJar = jarCandidates.find((f) => f.toLowerCase().includes('forge'));
        const serverJar = jarCandidates.find((f) => f.toLowerCase() === 'server.jar');

        detectedJar = paperJar || purpurJar || fabricJar || forgeJar || serverJar || jarCandidates[0];

        if (detectedJar.toLowerCase().includes('purpur')) detectedFork = 'Purpur';
        else if (detectedJar.toLowerCase().includes('fabric')) detectedFork = 'Fabric';
        else if (detectedJar.toLowerCase().includes('forge')) detectedFork = 'Forge';
        else if (detectedJar.toLowerCase().includes('paper')) detectedFork = 'Paper';
      }

      // Check server.properties for mc version or query
      const propsPath = path.join(localDir, 'server.properties');
      if (fs.existsSync(propsPath)) {
        onLog?.(`\x1b[36m[Auto-Config]\x1b[0m Detectado archivo server.properties oficial.\r\n`);
      }

      if (detectedJar) {
        onLog?.(`\x1b[32m[Auto-Config]\x1b[0m Jar ejecutable detectado: \x1b[1m${detectedJar}\x1b[0m (Fork: ${detectedFork})\r\n`);
      }

      const updated = {
        ...prevConfig,
        jarName: detectedJar || prevConfig.jarName || 'server.jar',
        fork: detectedFork,
        java: detectedJava,
        modPlatform: null,
        modpack: null,
      };

      dockerService.saveServerConfig(serviceId, updated);
      onLog?.(`\x1b[32m[PanelMaster Import]\x1b[0m Configuración de arranque guardada. El servidor está listo para encender.\r\n`);
    } catch (err: any) {
      console.warn(`[Auto-Config Notice] ${err.message}`);
    }
  }
}

export const importService = new ImportService();
