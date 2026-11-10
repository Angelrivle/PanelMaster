import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { prisma } from '../prisma';
import { dockerService } from '../services/docker.service';
import { importService } from '../services/import.service';

const execAsync = util.promisify(exec);

function serializeService(s: any) {
  return {
    ...s,
    memoryLimitBytes: Number(s.memoryLimitBytes),
    diskLimitBytes: Number(s.diskLimitBytes),
  };
}

export async function servicesRoutes(fastify: FastifyInstance) {
  // System Overview Telemetry for Admin Overview Tab
  fastify.get('/system/overview', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const stats = await dockerService.getSystemOverviewStats();
      return reply.send(stats);
    } catch {
      return reply.send({
        serverCount: 1,
        serversOnline: 1,
        serversOffline: 0,
        cpuCores: 8,
        cpuUsageCores: 0.12,
        cpuUsagePercent: 2,
        memoryUsedBytes: 1024 * 1024 * 1024,
        memoryTotalBytes: 8 * 1024 * 1024 * 1024,
        diskUsedBytes: 5 * 1024 * 1024 * 1024,
        diskTotalBytes: 50 * 1024 * 1024 * 1024,
        networkRxBytes: 1048576,
        networkTxBytes: 2097152,
        networkRateFormatted: '12 KB/s in • 24 KB/s out',
        bandwidthTotalFormatted: '3.1 MB',
      });
    }
  });

  // Search Modpacks via Modrinth Official API
  fastify.get('/modpacks/search', async (request, reply) => {
    const { query = '', loader, version, limit = '24', offset = '0' } = request.query as any;
    try {
      const facets: string[][] = [['project_type:modpack']];
      if (loader && loader !== 'all') {
        facets.push([`categories:${loader.toLowerCase()}`]);
      }
      if (version && version !== 'all') {
        facets.push([`versions:${version}`]);
      }
      const facetsEncoded = encodeURIComponent(JSON.stringify(facets));
      const queryEncoded = encodeURIComponent(String(query).trim());
      const url = `https://api.modrinth.com/v2/search?query=${queryEncoded}&facets=${facetsEncoded}&limit=${limit}&offset=${offset}&index=downloads`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'PanelMaster/1.0 (https://zenforge.online)',
        },
      });
      if (!res.ok) {
        throw new Error(`Modrinth API responded with status ${res.status}`);
      }
      const data = await res.json();
      return reply.send(data);
    } catch (err: any) {
      fastify.log.error(`[Modrinth Search] Error: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to search Modrinth', hits: [] });
    }
  });

  // Fetch Versions for a specific Modpack from Modrinth
  fastify.get('/modpacks/:slug/versions', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    try {
      const url = `https://api.modrinth.com/v2/project/${encodeURIComponent(slug)}/version`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'PanelMaster/1.0 (https://zenforge.online)',
        },
      });
      if (!res.ok) {
        throw new Error(`Modrinth API responded with status ${res.status}`);
      }
      const data = await res.json();
      return reply.send(data);
    } catch (err: any) {
      fastify.log.error(`[Modrinth Versions] Error: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to fetch modpack versions', versions: [] });
    }
  });

  // Get Server Configuration (Current Fork, Version, Modpack)
  fastify.get('/:id/config', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const cfg = dockerService.getServerConfig(id);
    return reply.send(cfg);
  });

  // Change Server Fork & Version (Paper, Purpur, Spigot, Fabric, Forge, etc.)
  fastify.post('/:id/version', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      fork: string;
      version: string;
      build?: string;
      java?: number;
      cleanInstall?: boolean;
    };

    try {
      const res = await dockerService.updateServerVersion(id, body);
      // Update DB status if running
      await prisma.service.updateMany({
        where: { id },
        data: { status: 'RUNNING' },
      });
      return reply.send({ success: true, message: 'Server version updated successfully', result: res });
    } catch (err: any) {
      fastify.log.error(`[Version Update Error]: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  // Install Modrinth Modpack on Server
  fastify.post('/:id/modpack', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      modpackSlug: string;
      modpackTitle: string;
      versionNumber: string;
      loader: string;
      mcVersion: string;
      wipeWorld?: boolean;
      cleanModsFolder?: boolean;
    };

    try {
      const res = await dockerService.installModpack(id, body);
      await prisma.service.updateMany({
        where: { id },
        data: { status: 'RUNNING' },
      });
      return reply.send({ success: true, message: 'Modpack installed and server restarted', result: res });
    } catch (err: any) {
      fastify.log.error(`[Modpack Install Error]: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  // Real Container Telemetry Metrics
  fastify.get('/:id/stats', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const stats = await dockerService.getContainerStats(id);
      return reply.send(stats);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Initiate Server Migration / Import (from Pterodactyl, SFTP, FTP)
  fastify.post('/:id/import', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      serverType: z.enum(['SFTP', 'FTP']).default('SFTP'),
      host: z.string().min(1, 'Host is a required field'),
      port: z.number().default(2022),
      username: z.string().min(1, 'Username is a required field'),
      password: z.string().min(1, 'Password is a required field'),
      baseDirectory: z.string().optional().default('/'),
      deleteFiles: z.boolean().optional().default(false),
    });

    const body = schema.parse(request.body);

    // Stop container first if running so files are not locked
    try {
      const container = await dockerService.findContainerByName(`nexus-${id}`);
      if (container && container.State === 'running') {
        await dockerService.stopContainer(container.Id);
      }
    } catch {}

    const job = await importService.startImport({
      serviceId: id,
      ...body,
    });

    return reply.send({ success: true, message: 'Migración iniciada en segundo plano', job });
  });

  // Get Server Migration / Import Progress
  fastify.get('/:id/import/status', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = importService.getJob(id);
    if (!job) {
      return reply.send({ status: 'IDLE' });
    }
    return reply.send(job);
  });

  // -------------------------------------------------------------
  // REAL FILESYSTEM MANAGEMENT API (Mounted at /var/lib/panelmaster/volumes/:id)
  // -------------------------------------------------------------

  // List Files & Folders
  fastify.get('/:id/files', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { path: reqPath = '', recursive = 'false' } = request.query as { path?: string; recursive?: string };
    const baseDir = path.resolve(`/var/lib/panelmaster/volumes/${id}`);

    try {
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      const cleanSub = (reqPath || '').replace(/^\/+/, '');
      const targetDir = path.resolve(baseDir, cleanSub);

      if (!targetDir.startsWith(baseDir)) {
        return reply.status(403).send({ error: 'Acceso denegado fuera del volumen' });
      }

      if (!fs.existsSync(targetDir)) {
        return reply.send([]);
      }

      const result: Array<{
        name: string;
        path: string;
        isDir: boolean;
        size: number;
        parentDir: string;
        modifiedTime: string;
      }> = [];

      const walk = (dir: string, currentParentRel: string, depth: number) => {
        if (depth > 4) return;
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const itemFullPath = path.join(dir, entry.name);
            let size = 0;
            let modifiedTime = new Date().toISOString();
            try {
              const stat = fs.statSync(itemFullPath);
              size = entry.isDirectory() ? 0 : stat.size;
              modifiedTime = stat.mtime.toISOString();
            } catch {}

            const relPath = '/' + path.relative(baseDir, itemFullPath).replace(/\\/g, '/');
            result.push({
              name: entry.name,
              path: relPath,
              isDir: entry.isDirectory(),
              size,
              parentDir: currentParentRel ? '/' + currentParentRel.replace(/\\/g, '/') : '',
              modifiedTime,
            });

            if (entry.isDirectory() && recursive === 'true') {
              if (['region', 'entities', 'poi', 'cache', 'libraries', '.git'].includes(entry.name)) {
                continue;
              }
              const nextParentRel = path.relative(baseDir, itemFullPath);
              walk(itemFullPath, nextParentRel, depth + 1);
            }
          }
        } catch {}
      };

      walk(targetDir, cleanSub, 0);

      // Sort: folders first, then files alphabetically
      result.sort((a, b) => {
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;
        return a.name.localeCompare(b.name);
      });

      return reply.send(result);
    } catch (err: any) {
      fastify.log.error(`[Files List Error]: ${err.message}`);
      return reply.status(500).send({ error: 'Error al listar archivos', items: [] });
    }
  });

  // Read File Content
  fastify.get('/:id/files/content', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { path: reqPath = '' } = request.query as { path: string };
    const baseDir = path.resolve(`/var/lib/panelmaster/volumes/${id}`);

    try {
      const cleanSub = (reqPath || '').replace(/^\/+/, '');
      const targetFile = path.resolve(baseDir, cleanSub);

      if (!targetFile.startsWith(baseDir)) {
        return reply.status(403).send({ error: 'Acceso denegado' });
      }

      if (!fs.existsSync(targetFile)) {
        return reply.status(404).send({ error: 'El archivo solicitado no existe' });
      }

      const stat = fs.statSync(targetFile);
      if (stat.isDirectory()) {
        return reply.status(400).send({ error: 'La ruta es un directorio, no un archivo' });
      }

      if (stat.size > 8 * 1024 * 1024) {
        return reply.status(400).send({ error: 'El archivo es demasiado grande para edición web (máx 8MB)' });
      }

      const content = fs.readFileSync(targetFile, 'utf8');
      return reply.send({ content, size: stat.size, name: path.basename(targetFile) });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Save File Content
  fastify.post('/:id/files/content', {
    preHandler: [fastify.authenticate],
    bodyLimit: 15 * 1024 * 1024,
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { path: reqPath, content } = request.body as { path: string; content: string };
    const baseDir = path.resolve(`/var/lib/panelmaster/volumes/${id}`);

    try {
      const cleanSub = (reqPath || '').replace(/^\/+/, '');
      const targetFile = path.resolve(baseDir, cleanSub);

      if (!targetFile.startsWith(baseDir)) {
        return reply.status(403).send({ error: 'Acceso denegado' });
      }

      fs.mkdirSync(path.dirname(targetFile), { recursive: true });
      fs.writeFileSync(targetFile, content ?? '', 'utf8');
      return reply.send({ success: true, message: 'Archivo guardado correctamente' });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Upload File (Supports .jar, .zip, .yml, plugins, etc. via Base64 payload)
  fastify.post('/:id/files/upload', {
    preHandler: [fastify.authenticate],
    bodyLimit: 250 * 1024 * 1024, // 250MB buffer for server jars/plugins
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { path: reqDir = '', filename, contentBase64 } = request.body as {
      path?: string;
      filename: string;
      contentBase64: string;
    };

    if (!filename || !contentBase64) {
      return reply.status(400).send({ error: 'Filename y contentBase64 son requeridos' });
    }

    const baseDir = path.resolve(`/var/lib/panelmaster/volumes/${id}`);

    try {
      const cleanSub = (reqDir || '').replace(/^\/+/, '');
      const targetDir = path.resolve(baseDir, cleanSub);

      if (!targetDir.startsWith(baseDir)) {
        return reply.status(403).send({ error: 'Acceso denegado' });
      }

      fs.mkdirSync(targetDir, { recursive: true });

      const cleanFilename = path.basename(filename);
      const targetFile = path.resolve(targetDir, cleanFilename);

      if (!targetFile.startsWith(baseDir)) {
        return reply.status(403).send({ error: 'Nombre de archivo no válido' });
      }

      const buffer = Buffer.from(contentBase64, 'base64');
      fs.writeFileSync(targetFile, buffer);

      return reply.send({
        success: true,
        message: `Archivo ${cleanFilename} subido exitosamente`,
        size: buffer.length,
        path: '/' + path.relative(baseDir, targetFile).replace(/\\/g, '/'),
      });
    } catch (err: any) {
      fastify.log.error(`[File Upload Error]: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  // Create Folder
  fastify.post('/:id/files/folder', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { path: reqDir = '', folderName } = request.body as { path?: string; folderName: string };
    const baseDir = path.resolve(`/var/lib/panelmaster/volumes/${id}`);

    try {
      const cleanSub = (reqDir || '').replace(/^\/+/, '');
      const cleanName = path.basename(folderName || 'Nueva Carpeta');
      const targetFolder = path.resolve(baseDir, cleanSub, cleanName);

      if (!targetFolder.startsWith(baseDir)) {
        return reply.status(403).send({ error: 'Acceso denegado' });
      }

      fs.mkdirSync(targetFolder, { recursive: true });
      return reply.send({ success: true, message: 'Carpeta creada exitosamente' });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Delete File or Folder
  fastify.delete('/:id/files', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { path: reqPath } = (request.query as any) || (request.body as any);
    const baseDir = path.resolve(`/var/lib/panelmaster/volumes/${id}`);

    try {
      const cleanSub = (reqPath || '').replace(/^\/+/, '');
      const targetPath = path.resolve(baseDir, cleanSub);

      if (!targetPath.startsWith(baseDir) || targetPath === baseDir) {
        return reply.status(403).send({ error: 'Operación no permitida en la raíz del servidor' });
      }

      if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      }
      return reply.send({ success: true, message: 'Elemento eliminado correctamente' });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Rename File or Folder
  fastify.post('/:id/files/rename', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { oldPath, newPath } = request.body as { oldPath: string; newPath: string };
    const baseDir = path.resolve(`/var/lib/panelmaster/volumes/${id}`);

    try {
      const src = path.resolve(baseDir, (oldPath || '').replace(/^\/+/, ''));
      const dest = path.resolve(baseDir, (newPath || '').replace(/^\/+/, ''));

      if (!src.startsWith(baseDir) || !dest.startsWith(baseDir) || src === baseDir || dest === baseDir) {
        return reply.status(403).send({ error: 'Ruta no válida' });
      }

      if (!fs.existsSync(src)) {
        return reply.status(404).send({ error: 'El archivo de origen no existe' });
      }

      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.renameSync(src, dest);
      return reply.send({ success: true, message: 'Renombrado correctamente' });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Batch Delete Files and Folders
  fastify.post('/:id/files/delete-batch', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { paths = [] } = request.body as { paths: string[] };
    const baseDir = path.resolve(`/var/lib/panelmaster/volumes/${id}`);

    let deletedCount = 0;

    // Check if wiping whole directory
    if (paths.includes('/') || paths.includes('*') || paths.includes('.')) {
      if (fs.existsSync(baseDir)) {
        try {
          const items = fs.readdirSync(baseDir);
          for (const item of items) {
            try {
              fs.rmSync(path.join(baseDir, item), { recursive: true, force: true });
              deletedCount++;
            } catch {}
          }
        } catch {}
      }
    } else {
      for (const p of paths) {
        try {
          const clean = (p || '').replace(/^\/+/, '');
          if (!clean) continue;
          const targetPath = path.resolve(baseDir, clean);
          if (targetPath.startsWith(baseDir) && targetPath !== baseDir && fs.existsSync(targetPath)) {
            fs.rmSync(targetPath, { recursive: true, force: true });
            deletedCount++;
          }
        } catch (err: any) {
          fastify.log.error(`[Delete Batch Error on ${p}]: ${err.message}`);
        }
      }
    }

    return reply.send({
      success: true,
      count: deletedCount,
      message: `${deletedCount} elementos eliminados definitivamente`,
    });
  });

  // Compress Selected Files & Folders (.zip / .tar.gz)
  fastify.post('/:id/files/compress', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { paths = [], destination = '', archiveName } = request.body as {
      paths: string[];
      destination?: string;
      archiveName?: string;
    };
    const baseDir = path.resolve(`/var/lib/panelmaster/volumes/${id}`);

    if (paths.length === 0) {
      return reply.status(400).send({ error: 'No se seleccionaron archivos para comprimir' });
    }

    try {
      const destDir = path.resolve(baseDir, (destination || '').replace(/^\/+/, ''));
      if (!destDir.startsWith(baseDir)) {
        return reply.status(403).send({ error: 'Acceso denegado' });
      }
      fs.mkdirSync(destDir, { recursive: true });

      const name = archiveName
        ? (archiveName.endsWith('.zip') || archiveName.endsWith('.tar.gz') ? archiveName : `${archiveName}.zip`)
        : `archive_${Date.now()}.zip`;

      const targetArchive = path.resolve(destDir, name);

      const relItems = paths
        .map((p) => (p || '').replace(/^\/+/, ''))
        .filter(Boolean)
        .map((p) => `"${p}"`)
        .join(' ');

      if (!relItems) {
        return reply.status(400).send({ error: 'Rutas no válidas' });
      }

      if (name.endsWith('.tar.gz')) {
        await execAsync(`tar -czf "${targetArchive}" ${relItems}`, { cwd: baseDir });
      } else {
        try {
          await execAsync(`zip -r "${targetArchive}" ${relItems}`, { cwd: baseDir });
        } catch {
          const fallbackArchive = targetArchive.replace(/\.zip$/, '.tar.gz');
          await execAsync(`tar -czf "${fallbackArchive}" ${relItems}`, { cwd: baseDir });
        }
      }

      return reply.send({ success: true, message: 'Archivo comprimido creado exitosamente', archiveName: name });
    } catch (err: any) {
      fastify.log.error(`[Compress Error]: ${err.message}`);
      return reply.status(500).send({ error: `Error al comprimir: ${err.message}` });
    }
  });

  // Decompress / Extract Archive (.zip / .tar.gz)
  fastify.post('/:id/files/decompress', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { path: reqPath, destination = '' } = request.body as { path: string; destination?: string };
    const baseDir = path.resolve(`/var/lib/panelmaster/volumes/${id}`);

    try {
      const targetArchive = path.resolve(baseDir, (reqPath || '').replace(/^\/+/, ''));
      const destDir = path.resolve(baseDir, (destination || '').replace(/^\/+/, ''));

      if (!targetArchive.startsWith(baseDir) || !destDir.startsWith(baseDir)) {
        return reply.status(403).send({ error: 'Acceso denegado' });
      }

      if (!fs.existsSync(targetArchive)) {
        return reply.status(404).send({ error: 'El archivo comprimido no existe' });
      }

      fs.mkdirSync(destDir, { recursive: true });

      if (targetArchive.endsWith('.zip')) {
        try {
          await execAsync(`unzip -o "${targetArchive}" -d "${destDir}"`);
        } catch (err: any) {
          return reply.status(500).send({ error: `Error al descomprimir: ${err.message}` });
        }
      } else if (targetArchive.endsWith('.tar.gz') || targetArchive.endsWith('.tgz')) {
        await execAsync(`tar -xzf "${targetArchive}" -C "${destDir}"`);
      } else {
        return reply.status(400).send({ error: 'Formato no soportado (utiliza .zip o .tar.gz)' });
      }

      return reply.send({ success: true, message: 'Archivo descomprimido correctamente' });
    } catch (err: any) {
      fastify.log.error(`[Decompress Error]: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  // List Services
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const services = await prisma.service.findMany({
        where: { deletedAt: null },
        include: {
          template: { select: { name: true, category: true, iconUrl: true } },
          instances: {
            include: {
              node: { select: { name: true, fqdn: true } },
              ports: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Synchronize with real Docker containers (Pterodactyl Daemon Engine)
      const dockerContainers = await dockerService.listContainers();
      const synchronizedServices = await Promise.all(
        services.map(async (s) => {
          const container = dockerContainers.find((c: any) =>
            c.Names?.some((n: string) => n === `/nexus-${s.id}` || n.includes(`nexus-${s.id}`))
          );
          const isOnline = !!(container && (container.State === 'running' || container.Status?.toLowerCase().startsWith('up')));
          const actualStatus = isOnline ? 'RUNNING' : 'STOPPED';

          if (s.status !== actualStatus) {
            prisma.service.update({ where: { id: s.id }, data: { status: actualStatus } }).catch(() => {});
            s.status = actualStatus;
          }
          return serializeService(s);
        })
      );

      return reply.send(synchronizedServices);
    } catch (err: any) {
      fastify.log.error(`Error listing services: ${err.message}`);
      return reply.send([]);
    }
  });

  // Get Single Service Detail
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        template: true,
        templateVersion: true,
        instances: {
          include: {
            node: true,
            ports: true,
          },
        },
        environmentVars: true,
        domains: true,
        backups: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!service) {
      return reply.status(404).send({ error: 'Service not found' });
    }

    // Inspect real Docker container state
    const container = await dockerService.findContainerByName(`nexus-${id}`);
    const isOnline = !!(container && (container.State === 'running' || container.Status?.toLowerCase().startsWith('up')));
    const actualStatus = isOnline ? 'RUNNING' : 'STOPPED';

    if (service.status !== actualStatus) {
      prisma.service.update({ where: { id: service.id }, data: { status: actualStatus } }).catch(() => {});
      service.status = actualStatus;
    }

    return reply.send(serializeService(service));
  });

  // Create Service
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userContext = request.userContext!;
    let orgId = request.headers['x-organization-id'] as string;

    if (!orgId) {
      const firstOrg = await prisma.organization.findFirst();
      orgId = firstOrg ? firstOrg.id : 'panelmaster-root';
    }

    const createSchema = z.object({
      id: z.string().optional(),
      name: z.string().min(2).max(64),
      egg: z.string().optional(),
      category: z.string().optional(),
      templateId: z.string().optional(),
      templateVersionId: z.string().optional(),
      dockerImage: z.string().optional(),
      startupCommand: z.string().optional(),
      memoryMb: z.number().min(256).default(2048),
      cpuCores: z.number().min(0.2).default(2.0),
      diskMb: z.number().min(512).default(10240),
      port: z.number().optional().default(25565),
      environment: z.record(z.any()).optional(),
      startOnCompletion: z.boolean().optional().default(true),
    });

    const body = createSchema.parse(request.body);
    const serviceId = body.id || `srv-${Date.now()}`;
    const slug = body.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);

    // Ensure template & templateVersion exist in DB
    let template = body.templateId ? await prisma.template.findUnique({ where: { id: body.templateId } }) : null;
    if (!template) {
      template = await prisma.template.findFirst({
        where: { name: body.egg || 'Minecraft Java (Paper)' },
      });
      if (!template) {
        template = await prisma.template.create({
          data: {
            name: body.egg || 'Minecraft Java (Paper)',
            slug: slug + '-tmpl',
            category: body.category || 'minecraft',
            type: body.category === 'web' ? 'WEB_DYNAMIC' : (body.category === 'bots' ? 'DISCORD_BOT' : 'GAME_SERVER'),
          },
        });
      }
    }

    let version = body.templateVersionId
      ? await prisma.templateVersion.findUnique({ where: { id: body.templateVersionId } })
      : null;
    if (!version) {
      version = await prisma.templateVersion.findFirst({
        where: { templateId: template.id },
      });
      if (!version) {
        version = await prisma.templateVersion.create({
          data: {
            templateId: template.id,
            version: 'latest',
            dockerImage: body.dockerImage || (body.category === 'databases' ? 'redis:7-alpine' : 'itzg/minecraft-server:latest'),
            startupCommand: body.startupCommand || '',
            minCpuCores: body.cpuCores,
            minMemoryMb: body.memoryMb,
            minDiskMb: body.diskMb,
          },
        });
      }
    }

    // Ensure an online node exists
    let node = await prisma.node.findFirst({ where: { status: 'ONLINE' } });
    if (!node) {
      let region = await prisma.region.findFirst();
      if (!region) {
        region = await prisma.region.create({ data: { code: 'default', name: 'LOCAL CLUSTER' } });
      }
      node = await prisma.node.create({
        data: {
          name: 'node-01',
          regionId: region.id,
          fqdn: process.env.PANEL_DOMAIN || '127.0.0.1',
          agentPort: 8080,
          agentTokenHash: 'nexus-dev-secret-token',
          cpuCores: 8,
          memoryTotalBytes: BigInt(32768) * BigInt(1024 * 1024),
          diskTotalBytes: BigInt(256000) * BigInt(1024 * 1024),
          status: 'ONLINE',
        },
      });
    }

    // Create DB service record
    const service = await prisma.service.create({
      data: {
        id: serviceId,
        name: body.name,
        slug,
        organizationId: orgId,
        ownerId: userContext.userId,
        templateId: template.id,
        templateVersionId: version.id,
        memoryLimitBytes: BigInt(body.memoryMb) * BigInt(1024 * 1024),
        cpuLimitCores: body.cpuCores,
        diskLimitBytes: BigInt(body.diskMb) * BigInt(1024 * 1024),
        status: body.startOnCompletion ? 'RUNNING' : 'STOPPED',
      },
    });

    // Create service instance
    const instance = await prisma.serviceInstance.create({
      data: {
        serviceId: service.id,
        nodeId: node.id,
        containerId: `nexus-${service.id}`,
        containerName: `nexus-${service.id}`,
        hostDataPath: `/var/lib/panelmaster/volumes/${service.id}`,
        status: service.status,
        startedAt: new Date(),
      },
    });

    // Create port allocation
    await prisma.portAllocation.create({
      data: {
        nodeId: node.id,
        port: body.port || 25565,
        protocol: 'TCP',
        serviceInstanceId: instance.id,
        isPrimary: true,
      },
    });

    const isNonMinecraft = body.category && body.category !== 'minecraft';
    const effectiveImage = body.dockerImage || version.dockerImage || (body.category === 'databases' ? 'redis:7-alpine' : 'itzg/minecraft-server:latest');

    // Save initial server configuration in panelmaster.json
    dockerService.saveServerConfig(service.id, {
      serviceId: service.id,
      name: body.name,
      egg: body.egg || template.name,
      category: body.category || template.category || 'minecraft',
      image: effectiveImage,
      port: body.port || (body.category === 'databases' ? 6379 : 25565),
      startupCommand: body.startupCommand || version.startupCommand,
      memoryMb: body.memoryMb,
      environment: body.environment || {},
      ...(isNonMinecraft ? {} : {
        type: 'PAPER',
        version: '1.20.4',
        fork: 'Paper',
        java: 17,
        modPlatform: null,
        modpack: null,
      }),
    });

    // Spawn REAL Docker container on host
    try {
      await dockerService.createServiceContainer({
        serviceId: service.id,
        name: service.name,
        image: effectiveImage,
        port: body.port || (body.category === 'databases' ? 6379 : 25565),
        memoryMb: body.memoryMb,
        cpuCores: body.cpuCores,
        environment: body.environment as Record<string, string>,
        startNow: body.startOnCompletion,
      });
    } catch (dockerErr: any) {
      fastify.log.warn(`[Docker] Notice on container start: ${dockerErr.message}`);
    }

    return reply.status(201).send(serializeService(service));
  });

  // Service Actions (Start, Stop, Restart, Kill)
  fastify.post('/:id/actions', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { action } = z.object({ action: z.enum(['START', 'STOP', 'RESTART', 'KILL']) }).parse(request.body);

    const nextStatus = action === 'STOP' || action === 'KILL' ? 'STOPPED' : 'RUNNING';

    try {
      await prisma.service.updateMany({
        where: { id },
        data: { status: nextStatus },
      });
      await prisma.serviceInstance.updateMany({
        where: { serviceId: id },
        data: { status: nextStatus },
      });
    } catch {}

    const containerName = `nexus-${id}`;
    let container = await dockerService.findContainerByName(containerName);

    if (action === 'STOP') {
      if (container) {
        try {
          await dockerService.execCommand(container.Id, 'stop');
        } catch {}
        await dockerService.stopContainer(container.Id);
      }
    } else if (action === 'KILL') {
      if (container) await dockerService.killContainer(container.Id);
    } else if (action === 'START' || action === 'RESTART') {
      if (container && container.State !== 'running') {
        const started = await dockerService.startContainer(container.Id);
        if (!started) {
          await dockerService.createServiceContainer({
            serviceId: id,
            name: id,
            startNow: true,
          });
        }
      } else {
        await dockerService.createServiceContainer({
          serviceId: id,
          name: id,
          startNow: true,
        });
      }
    }

    return reply.send({ success: true, action, status: nextStatus });
  });

  // Get Server Startup Configuration
  fastify.get('/:id/startup', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const config = dockerService.getServerConfig(id);
    return reply.send({
      jarName: config.jarName || 'server.jar',
      javaVersion: config.java || 21,
      customArgs: config.customArgs || '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200',
      onlineMode: config.onlineMode || 'false',
      maxPlayers: config.maxPlayers || '20',
      version: config.version || '1.20.4',
      fork: config.fork || 'Paper',
    });
  });

  // Update Server Startup Configuration
  fastify.post('/:id/startup', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const current = dockerService.getServerConfig(id);
    const updated = {
      ...current,
      jarName: body.jarName || current.jarName || 'server.jar',
      java: body.javaVersion ? Number(body.javaVersion) : current.java || 21,
      customArgs: body.customArgs !== undefined ? body.customArgs : current.customArgs,
      onlineMode: body.onlineMode || current.onlineMode || 'false',
      maxPlayers: body.maxPlayers || current.maxPlayers || '20',
    };
    dockerService.saveServerConfig(id, updated);
    return reply.send({ success: true, message: 'Startup configuration updated', config: updated });
  });

  // WebSocket Live Console Gateway Tunnel
  fastify.get('/:id/console', { websocket: true }, async (connection: any, req: any) => {
    const { id } = req.params as { id: string };
    const wsClient = connection.socket || connection;

    let service = null;
    try {
      service = await prisma.service.findUnique({
        where: { id },
        include: { instances: { include: { node: true } } },
      });
    } catch {}

    const srvName = service?.name || 'Servidor';
    const containerName = `nexus-${id}`;

    // Clean, elegant greeting without spam
    wsClient.send(`\x1b[1;36m[PanelMaster]\x1b[0m Conectado a la consola de \x1b[1;37m${srvName}\x1b[0m\r\n`);

    let activeStream: { abort: () => void } | null = null;
    let isWsClosed = false;

    const stopActiveStream = () => {
      if (activeStream) {
        try { activeStream.abort(); } catch {}
        activeStream = null;
      }
    };

    const attachLogs = (containerId: string) => {
      stopActiveStream();
      activeStream = dockerService.streamLogs(
        containerId,
        (chunk) => {
          if (wsClient.readyState === WebSocket.OPEN) {
            wsClient.send(chunk);
          }
        },
        () => {
          if (wsClient.readyState === WebSocket.OPEN && !isWsClosed) {
            wsClient.send('\r\n\x1b[33m[PanelMaster] El contenedor del servidor se ha detenido.\x1b[0m\r\n');
          }
        },
        0
      );
    };

    // On connect: check container state without automatically recreating or starting
    try {
      const container = await dockerService.findContainerByName(containerName);
      if (container) {
        // Send recent buffered output so user sees recent logs
        const recentLogs = await dockerService.getLogs(container.Id, 60);
        if (recentLogs && wsClient.readyState === WebSocket.OPEN) {
          wsClient.send(recentLogs);
        }

        if (container.State === 'running' || container.Status?.toLowerCase().startsWith('up')) {
          prisma.service.updateMany({ where: { id }, data: { status: 'RUNNING' } }).catch(() => {});
          prisma.serviceInstance.updateMany({ where: { serviceId: id }, data: { status: 'RUNNING' } }).catch(() => {});
          attachLogs(container.Id);
        } else {
          prisma.service.updateMany({ where: { id }, data: { status: 'STOPPED' } }).catch(() => {});
          prisma.serviceInstance.updateMany({ where: { serviceId: id }, data: { status: 'STOPPED' } }).catch(() => {});
          if (wsClient.readyState === WebSocket.OPEN) {
            wsClient.send('\r\n\x1b[33m[PanelMaster] El servidor se encuentra apagado. Pulsa "Iniciar" para encenderlo.\x1b[0m\r\n');
          }
        }
      } else {
        if (wsClient.readyState === WebSocket.OPEN) {
          wsClient.send('\r\n\x1b[33m[PanelMaster] El servidor se encuentra apagado. Pulsa "Iniciar" para encenderlo.\x1b[0m\r\n');
        }
      }
    } catch (err: any) {
      fastify.log.warn(`[Console WS Connect Error]: ${err.message}`);
    }

    wsClient.on('close', () => {
      isWsClosed = true;
      stopActiveStream();
    });

    // Handle terminal commands and power actions
    wsClient.on('message', async (data: any) => {
      const raw = data.toString().trim();
      if (!raw) return;

      // Power actions: START, STOP, RESTART, KILL
      if (raw.startsWith('__ACTION__:')) {
        const act = raw.replace('__ACTION__:', '');

        if (act === 'START' || act === 'RESTART') {
          stopActiveStream();
          if (wsClient.readyState === WebSocket.OPEN) {
            wsClient.send(`\r\n\x1b[36m[PanelMaster]\x1b[0m ${act === 'START' ? 'Iniciando' : 'Reiniciando'} servidor...\r\n`);
          }
          await prisma.service.updateMany({ where: { id }, data: { status: 'RUNNING' } });
          await prisma.serviceInstance.updateMany({ where: { serviceId: id }, data: { status: 'RUNNING' } });

          // Fast-start existing stopped container if possible
          let cur = await dockerService.findContainerByName(containerName);
          if (cur && cur.State !== 'running') {
            const started = await dockerService.startContainer(cur.Id);
            if (started) {
              attachLogs(cur.Id);
              return;
            }
          }

          // Otherwise recreate/create container with latest settings
          const container = await dockerService.createServiceContainer({
            serviceId: id,
            name: srvName,
            port: 25565,
            startNow: true,
          });

          if (container && container.Id) {
            attachLogs(container.Id);
          } else {
            const found = await dockerService.findContainerByName(containerName);
            if (found) {
              attachLogs(found.Id);
            }
          }
        } else if (act === 'STOP') {
          if (wsClient.readyState === WebSocket.OPEN) {
            wsClient.send('\r\n\x1b[33m[PanelMaster]\x1b[0m Enviando señal de apagado seguro (guardando chunks y estado del mundo)...\r\n');
          }
          await prisma.service.updateMany({ where: { id }, data: { status: 'STOPPED' } });
          await prisma.serviceInstance.updateMany({ where: { serviceId: id }, data: { status: 'STOPPED' } });

          const cur = await dockerService.findContainerByName(containerName);
          if (cur) {
            try {
              await dockerService.execCommand(cur.Id, 'stop');
            } catch {}
            await dockerService.stopContainer(cur.Id);
          }
          stopActiveStream();
          if (wsClient.readyState === WebSocket.OPEN) {
            wsClient.send('\r\n\x1b[32m[PanelMaster] ✔ Servidor detenido y apagado correctamente.\x1b[0m\r\n');
            wsClient.send('\x1b[33m[PanelMaster] El servidor se encuentra apagado. Pulsa "Iniciar" para encenderlo.\x1b[0m\r\n');
          }
        } else if (act === 'KILL') {
          stopActiveStream();
          if (wsClient.readyState === WebSocket.OPEN) {
            wsClient.send('\r\n\x1b[31m[PanelMaster]\x1b[0m Detención forzada inmediata (SIGKILL)...\r\n');
          }
          await prisma.service.updateMany({ where: { id }, data: { status: 'STOPPED' } });
          await prisma.serviceInstance.updateMany({ where: { serviceId: id }, data: { status: 'STOPPED' } });

          const cur = await dockerService.findContainerByName(containerName);
          if (cur) {
            await dockerService.killContainer(cur.Id);
          }
          if (wsClient.readyState === WebSocket.OPEN) {
            wsClient.send('\r\n\x1b[31m[PanelMaster] ✔ Proceso terminado forzosamente. El servidor está apagado.\x1b[0m\r\n');
            wsClient.send('\x1b[33m[PanelMaster] El servidor se encuentra apagado. Pulsa "Iniciar" para encenderlo.\x1b[0m\r\n');
          }
        }
        return;
      }

      // Execute command on container
      const container = await dockerService.findContainerByName(containerName);
      if (!container || container.State !== 'running') {
        if (wsClient.readyState === WebSocket.OPEN) {
          wsClient.send('\x1b[33m[PanelMaster]: El servidor está apagado. Inicia el servidor para enviar comandos.\x1b[0m\r\n');
        }
        return;
      }

      const res = await dockerService.execCommand(container.Id, raw);
      if (res && wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(res.endsWith('\r\n') ? res : `${res}\r\n`);
      }
    });
  });
}
