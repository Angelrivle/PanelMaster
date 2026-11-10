import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface CreateServiceContainerOptions {
  serviceId: string;
  name: string;
  image?: string;
  port?: number;
  memoryMb?: number;
  cpuCores?: number;
  environment?: Record<string, string>;
  startNow?: boolean;
}

export interface ContainerStatsResult {
  cpuPercent: number;
  memoryUsageBytes: number;
  memoryLimitBytes: number;
  diskUsageBytes: number;
  diskLimitBytes: number;
  networkRxBytes: number;
  networkTxBytes: number;
  networkRxFormatted: string;
  networkTxFormatted: string;
  isOnline: boolean;
}

export interface SystemOverviewStats {
  serverCount: number;
  serversOnline: number;
  serversOffline: number;
  cpuCores: number;
  cpuUsageCores: number;
  cpuUsagePercent: number;
  memoryUsedBytes: number;
  memoryTotalBytes: number;
  diskUsedBytes: number;
  diskTotalBytes: number;
  networkRxBytes: number;
  networkTxBytes: number;
  networkRateFormatted: string;
  bandwidthTotalFormatted: string;
}

export class DockerService {
  private socketPath = '/var/run/docker.sock';
  private prevNetworkRx = 0;
  private prevNetworkTx = 0;
  private prevNetworkTime = Date.now();
  private eventListeners: Array<(event: { serviceId: string; status: 'RUNNING' | 'STOPPED' | 'OOM' }) => void> = [];

  onContainerEvent(cb: (event: { serviceId: string; status: 'RUNNING' | 'STOPPED' | 'OOM' }) => void) {
    this.eventListeners.push(cb);
  }

  startDaemonEventListener() {
    if (!this.isAvailable()) return;

    const connectEvents = () => {
      try {
        const req = http.request(
          {
            socketPath: this.socketPath,
            path: '/v1.43/events?filters=%7B%22type%22%3A%5B%22container%22%5D%7D',
            method: 'GET',
          },
          (res) => {
            let buffer = '';
            res.on('data', (chunk) => {
              buffer += chunk.toString('utf-8');
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              for (const line of lines) {
                if (!line.trim()) continue;
                try {
                  const ev = JSON.parse(line.trim());
                  const cName = ev.Actor?.Attributes?.name || '';
                  if (cName.startsWith('nexus-') || cName.startsWith('/nexus-')) {
                    const sId = cName.replace(/^\/?nexus-/, '');
                    let newStatus: 'RUNNING' | 'STOPPED' | 'OOM' | null = null;
                    if (ev.status === 'start') newStatus = 'RUNNING';
                    else if (ev.status === 'die' || ev.status === 'stop' || ev.status === 'kill') newStatus = 'STOPPED';
                    else if (ev.status === 'oom') newStatus = 'OOM';

                    if (newStatus) {
                      this.eventListeners.forEach((listener) => listener({ serviceId: sId, status: newStatus! }));
                    }
                  }
                } catch {}
              }
            });
            res.on('end', () => {
              setTimeout(connectEvents, 3000);
            });
          }
        );
        req.on('error', () => {
          setTimeout(connectEvents, 5000);
        });
        req.end();
      } catch {
        setTimeout(connectEvents, 5000);
      }
    };

    connectEvents();
  }

  isAvailable(): boolean {
    try {
      return fs.existsSync(this.socketPath);
    } catch {
      return false;
    }
  }

  request(path: string, method = 'GET', body?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          socketPath: this.socketPath,
          path: `/v1.43${path}`,
          method,
          headers: {
            'Content-Type': 'application/json',
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            let parsed: any = null;
            try {
              parsed = data ? JSON.parse(data) : null;
            } catch {
              parsed = data;
            }
            if (res.statusCode && res.statusCode >= 400) {
              const msg = parsed?.message || (typeof parsed === 'string' ? parsed : `Docker HTTP ${res.statusCode}`);
              const err = new Error(msg);
              (err as any).statusCode = res.statusCode;
              return reject(err);
            }
            resolve(parsed);
          });
        }
      );
      req.on('error', (err) => reject(err));
      if (body) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }
      req.end();
    });
  }

  async listContainers(): Promise<any[]> {
    if (!this.isAvailable()) return [];
    try {
      const res = await this.request('/containers/json?all=1');
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  }

  async findContainerByName(name: string): Promise<any | null> {
    const list = await this.listContainers();
    return list.find((c) => c.Names?.some((n: string) => n === `/${name}` || n.includes(name))) || null;
  }

  async ensureImage(image: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const inspect = await this.request(`/images/${encodeURIComponent(image)}/json`);
      if (inspect && inspect.Id) return true;
    } catch {}

    return new Promise((resolve) => {
      const req = http.request(
        {
          socketPath: this.socketPath,
          path: `/v1.43/images/create?fromImage=${encodeURIComponent(image)}`,
          method: 'POST',
        },
        (res) => {
          res.on('data', () => {});
          res.on('end', () => resolve(true));
        }
      );
      req.on('error', () => resolve(false));
      req.end();
    });
  }

  getServerConfig(serviceId: string): any {
    const hostDataPath = `/var/lib/panelmaster/volumes/${serviceId}`;
    const cfgPath = path.join(hostDataPath, 'panelmaster.json');
    try {
      if (fs.existsSync(cfgPath)) {
        return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      }
    } catch {}
    return {
      type: 'PAPER',
      version: '1.20.4',
      fork: 'Paper',
      build: 'Build #498',
      java: 17,
      modPlatform: null,
      modpack: null,
      modpackTitle: null,
      modpackVersion: null,
    };
  }

  saveServerConfig(serviceId: string, config: any) {
    const hostDataPath = `/var/lib/panelmaster/volumes/${serviceId}`;
    try {
      if (!fs.existsSync(hostDataPath)) {
        fs.mkdirSync(hostDataPath, { recursive: true });
      }
      const cfgPath = path.join(hostDataPath, 'panelmaster.json');
      fs.writeFileSync(cfgPath, JSON.stringify(config, null, 2), 'utf8');
    } catch {}
  }

  async updateServerVersion(
    serviceId: string,
    options: { fork: string; version: string; build?: string; java?: number; cleanInstall?: boolean }
  ) {
    const hostDataPath = `/var/lib/panelmaster/volumes/${serviceId}`;
    const prevConfig = this.getServerConfig(serviceId);

    // Normalize fork name to itzg TYPE
    const rawFork = (options.fork || 'paper').trim().toLowerCase();
    let type = 'PAPER';
    if (rawFork.includes('purpur')) type = 'PURPUR';
    else if (rawFork.includes('paper')) type = 'PAPER';
    else if (rawFork.includes('spigot')) type = 'SPIGOT';
    else if (rawFork.includes('bukkit') || rawFork.includes('craftbukkit')) type = 'BUKKIT';
    else if (rawFork.includes('fabric')) type = 'FABRIC';
    else if (rawFork.includes('forge') && !rawFork.includes('neo')) type = 'FORGE';
    else if (rawFork.includes('neoforge')) type = 'NEOFORGE';
    else if (rawFork.includes('vanilla')) type = 'VANILLA';
    else if (rawFork.includes('velocity')) type = 'VELOCITY';
    else if (rawFork.includes('bungee')) type = 'BUNGEECORD';
    else if (rawFork.includes('waterfall')) type = 'WATERFALL';
    else if (rawFork.includes('mohist')) type = 'MOHIST';
    else if (rawFork.includes('magma')) type = 'MAGMA';
    else if (rawFork.includes('catserver')) type = 'CATSERVER';
    else type = rawFork.toUpperCase();

    // Check if downgrading minor version (e.g. 1.20 -> 1.8)
    const prevMinorMatch = (prevConfig.version || '1.20.4').match(/^1\.(\d+)/);
    const newMinorMatch = (options.version || '').match(/^1\.(\d+)/);
    const isDowngrade = prevMinorMatch && newMinorMatch && parseInt(newMinorMatch[1], 10) < parseInt(prevMinorMatch[1], 10);

    // If clean install, downgrade, or switching away from a modpack, wipe mods and incompatible configs
    if (options.cleanInstall || isDowngrade || prevConfig.modPlatform) {
      try {
        const modsPath = path.join(hostDataPath, 'mods');
        if (fs.existsSync(modsPath)) fs.rmSync(modsPath, { recursive: true, force: true });
        const configPath = path.join(hostDataPath, 'config');
        if (fs.existsSync(configPath)) fs.rmSync(configPath, { recursive: true, force: true });

        // Clean modpack markers and cached engine states
        const modpackMarkers = ['.modrinth-modpack', '.modrinth', '.fabric', '.quilt', '.forge', '.neoforge', '.curseforge'];
        for (const marker of modpackMarkers) {
          const mPath = path.join(hostDataPath, marker);
          if (fs.existsSync(mPath)) fs.rmSync(mPath, { recursive: true, force: true });
        }

        if (fs.existsSync(hostDataPath)) {
          const items = fs.readdirSync(hostDataPath);
          for (const item of items) {
            const itemPath = path.join(hostDataPath, item);
            if (
              item.endsWith('.jar') ||
              item === 'cache' ||
              item === 'libraries' ||
              item === '.fabric' ||
              item === 'paper.yml' ||
              item === 'spigot.yml' ||
              item === 'bukkit.yml' ||
              item === 'paper-global.yml' ||
              item === 'paper-world-defaults.yml' ||
              item === 'usercache.json'
            ) {
              fs.rmSync(itemPath, { recursive: true, force: true });
            }

            // On full cleanInstall, also wipe plugins
            if (options.cleanInstall && item === 'plugins') {
              fs.rmSync(itemPath, { recursive: true, force: true });
            }
          }

          // Backup or reset world directories on downgrade or cleanInstall to prevent NBT chunk load crashes
          if (options.cleanInstall || isDowngrade) {
            for (const worldDir of ['world', 'world_nether', 'world_the_end']) {
              const targetDir = path.join(hostDataPath, worldDir);
              if (fs.existsSync(targetDir)) {
                if (options.cleanInstall) {
                  fs.rmSync(targetDir, { recursive: true, force: true });
                } else {
                  const backupName = `${worldDir}_backup_${(prevConfig.version || 'old').replace(/\./g, '_')}_${Date.now()}`;
                  try {
                    fs.renameSync(targetDir, path.join(hostDataPath, backupName));
                  } catch {
                    fs.rmSync(targetDir, { recursive: true, force: true });
                  }
                }
              }
            }
          }
        }
      } catch (err: any) {
        console.error(`[DockerService] Notice during version files cleanup: ${err.message}`);
      }
    }

    // Determine target Java version
    let javaVer = options.java;
    if (!javaVer) {
      const match = (options.version || '').match(/^1\.(\d+)/);
      if (match) {
        const minor = parseInt(match[1], 10);
        if (minor <= 16) javaVer = 8;
        else if (minor <= 20) {
          javaVer = (options.version?.startsWith('1.20.5') || options.version?.startsWith('1.20.6')) ? 21 : 17;
        } else {
          javaVer = 21;
        }
      } else {
        javaVer = 21;
      }
    }

    const updatedConfig = {
      ...prevConfig,
      type,
      version: options.version || '1.20.4',
      fork: options.fork || 'Paper',
      build: options.build || 'Latest',
      java: javaVer,
      modPlatform: null,
      modpack: null,
      modpackTitle: null,
      modpackVersion: null,
    };

    this.saveServerConfig(serviceId, updatedConfig);

    // Recreate container with new version parameters
    return this.createServiceContainer({
      serviceId,
      name: serviceId,
      startNow: true,
    });
  }

  async installModpack(
    serviceId: string,
    options: {
      modpackSlug: string;
      modpackTitle: string;
      versionNumber: string;
      loader: string;
      mcVersion: string;
      wipeWorld?: boolean;
      cleanModsFolder?: boolean;
    }
  ) {
    const hostDataPath = `/var/lib/panelmaster/volumes/${serviceId}`;
    const prevConfig = this.getServerConfig(serviceId);

    // Clean old mods / config if requested
    if (options.cleanModsFolder) {
      try {
        const modsPath = path.join(hostDataPath, 'mods');
        if (fs.existsSync(modsPath)) fs.rmSync(modsPath, { recursive: true, force: true });
        const configPath = path.join(hostDataPath, 'config');
        if (fs.existsSync(configPath)) fs.rmSync(configPath, { recursive: true, force: true });
      } catch {}
    }

    // Wipe world if requested
    if (options.wipeWorld) {
      try {
        for (const dir of ['world', 'world_nether', 'world_the_end']) {
          const worldPath = path.join(hostDataPath, dir);
          if (fs.existsSync(worldPath)) fs.rmSync(worldPath, { recursive: true, force: true });
        }
      } catch {}
    }

    // Clean old server jar files so itzg doesn't pick up old paper/vanilla jars
    try {
      if (fs.existsSync(hostDataPath)) {
        const files = fs.readdirSync(hostDataPath);
        for (const file of files) {
          if (file.endsWith('.jar') && !file.startsWith('fabric') && !file.startsWith('forge')) {
            fs.rmSync(path.join(hostDataPath, file), { force: true });
          }
        }
      }
    } catch {}

    // Determine correct Java version for this modpack's Minecraft version
    let javaVer = 21;
    const match = (options.mcVersion || '').match(/^1\.(\d+)/);
    if (match) {
      const minor = parseInt(match[1], 10);
      if (minor <= 16) javaVer = 8;
      else if (minor <= 20) {
        javaVer = (options.mcVersion.startsWith('1.20.5') || options.mcVersion.startsWith('1.20.6')) ? 21 : 17;
      } else {
        javaVer = 21;
      }
    }

    const loaderUpper = (options.loader || 'fabric').trim().toUpperCase();
    const updatedConfig = {
      ...prevConfig,
      type: loaderUpper,
      version: options.mcVersion || '1.20.1',
      java: javaVer,
      modPlatform: 'MODRINTH',
      modpack: options.modpackSlug,
      modpackTitle: options.modpackTitle,
      modpackVersion: options.versionNumber,
      loader: options.loader || 'Fabric',
      mcVersion: options.mcVersion || '1.20.1',
    };

    this.saveServerConfig(serviceId, updatedConfig);

    // Recreate container with Modrinth parameters
    return this.createServiceContainer({
      serviceId,
      name: serviceId,
      startNow: true,
    });
  }

  async createServiceContainer(options: CreateServiceContainerOptions): Promise<any> {
    if (!this.isAvailable()) {
      return { id: `mock-${options.serviceId}`, name: `nexus-${options.serviceId}` };
    }

    const containerName = `nexus-${options.serviceId}`;
    const savedConfig = this.getServerConfig(options.serviceId);
    const hostDataPath = `/var/lib/panelmaster/volumes/${options.serviceId}`;

    // Ensure volume directory exists
    try {
      if (!fs.existsSync(hostDataPath)) {
        fs.mkdirSync(hostDataPath, { recursive: true });
      }
    } catch {}

    // Remove old container if exists
    try {
      const existing = await this.findContainerByName(containerName);
      if (existing) {
        await this.request(`/containers/${existing.Id}?force=true`, 'DELETE');
      }
    } catch {}

    // Determine if workload is Minecraft or Generic (Redis, Postgres, Nginx, Node, Python, etc.)
    const category = savedConfig.category || '';
    const imageToCheck = (options.image || savedConfig.image || '').toLowerCase();
    const isMinecraft =
      category === 'minecraft' ||
      imageToCheck.includes('minecraft') ||
      (!category &&
        !imageToCheck.includes('redis') &&
        !imageToCheck.includes('valkey') &&
        !imageToCheck.includes('postgres') &&
        !imageToCheck.includes('mysql') &&
        !imageToCheck.includes('mariadb') &&
        !imageToCheck.includes('mongo') &&
        !imageToCheck.includes('nginx') &&
        !imageToCheck.includes('node') &&
        !imageToCheck.includes('python'));

    // ==========================================
    // 1. GENERIC / NON-MINECRAFT CONTAINER (Redis, etc.)
    // ==========================================
    if (!isMinecraft) {
      const genericImage = options.image || savedConfig.image || 'redis:7-alpine';
      const genericPort = options.port || savedConfig.port || (category === 'databases' ? 6379 : 80);
      const genericMemoryMb = options.memoryMb || savedConfig.memoryMb || 512;
      const portKey = `${genericPort}/tcp`;

      await this.ensureImage(genericImage);

      const envMap: Record<string, string> = {
        ...(savedConfig.environment || {}),
        ...(options.environment || {}),
      };

      const startupCmd = savedConfig.startupCommand || options.environment?.STARTUP || '';

      const createPayload: any = {
        Image: genericImage,
        Env: Object.entries(envMap).map(([k, v]) => `${k}=${v}`),
        ExposedPorts: {
          [portKey]: {},
        },
        HostConfig: {
          PortBindings: {
            [portKey]: [{ HostIp: '0.0.0.0', HostPort: String(genericPort) }],
          },
          Binds: [`${hostDataPath}:/data`],
          RestartPolicy: { Name: 'no' },
          MemoryReservation: genericMemoryMb * 1024 * 1024,
          Memory: (genericMemoryMb + 512) * 1024 * 1024,
          MemorySwap: -1,
        },
        Tty: true,
        OpenStdin: true,
      };

      if (startupCmd && !genericImage.includes('redis')) {
        createPayload.Cmd = ['sh', '-c', startupCmd];
      }

      try {
        const created = await this.request(
          `/containers/create?name=${encodeURIComponent(containerName)}`,
          'POST',
          createPayload
        );

        if (created && created.Id) {
          if (options.startNow !== false) {
            await this.startContainer(created.Id);
          }
          return created;
        }
      } catch (err: any) {
        console.error(`[DockerService] Error creating generic container: ${err.message}`);
      }
      return null;
    }

    // ==========================================
    // 2. MINECRAFT CONTAINER
    // ==========================================
    const port = options.port || savedConfig.port || 25565;
    const memoryMb = options.memoryMb || savedConfig.memoryMb || 2048;
    const serverType = options.environment?.TYPE || savedConfig.type || 'PAPER';
    const serverVersion = options.environment?.VERSION || savedConfig.version || '1.20.4';

    // Match Docker Java image to Minecraft version
    let image = options.image;
    if (image && image.includes('panelmaster/images:java-')) {
      // Translate custom runtime selection to itzg image
      const jv = parseInt(image.split('java-')[1], 10);
      if (jv === 8) image = 'itzg/minecraft-server:java8';
      else if (jv === 11) image = 'itzg/minecraft-server:java11';
      else if (jv === 16 || jv === 17) image = 'itzg/minecraft-server:java17';
      else image = 'itzg/minecraft-server:java21';
    } else if (!image || image === 'itzg/minecraft-server:latest') {
      const javaVer = savedConfig.java;
      if (javaVer === 8) {
        image = 'itzg/minecraft-server:java8';
      } else if (javaVer === 11) {
        image = 'itzg/minecraft-server:java11';
      } else if (javaVer === 16 || javaVer === 17) {
        image = 'itzg/minecraft-server:java17';
      } else if (javaVer >= 18) {
        image = 'itzg/minecraft-server:java21';
      } else {
        const match = serverVersion.match(/^1\.(\d+)/);
        if (match) {
          const minor = parseInt(match[1], 10);
          if (minor <= 16) {
            image = 'itzg/minecraft-server:java8';
          } else if (minor <= 20) {
            if (serverVersion.startsWith('1.20.5') || serverVersion.startsWith('1.20.6')) {
              image = 'itzg/minecraft-server:java21';
            } else {
              image = 'itzg/minecraft-server:java17';
            }
          } else {
            image = 'itzg/minecraft-server:java21';
          }
        } else {
          image = 'itzg/minecraft-server:java21';
        }
      }
    }

    // Pull image in background if needed
    await this.ensureImage(image);

    // Balanced JVM memory (65-70% heap, remaining for Metaspace/Native Netty to completely prevent OOM)
    const jvmHeapMb = Math.max(1024, Math.floor(memoryMb * 0.70));
    const isModpack = !!(savedConfig.modPlatform && savedConfig.modpack);

    const envMap: Record<string, string> = {
      EULA: 'TRUE',
      VERSION: serverVersion,
      ONLINE_MODE: 'FALSE',
      MAX_PLAYERS: '20',
      ENABLE_RCON: 'true',
      RCON_PASSWORD: 'panelmaster-rcon',
      RCON_PORT: '25575',
      BROADCAST_RCON_TO_OPS: 'false',
      INIT_MEMORY: `${Math.min(1024, jvmHeapMb)}M`,
      MAX_MEMORY: `${jvmHeapMb}M`,
      MEMORY: `${jvmHeapMb}M`,
      USE_AIKARS_FLAGS: 'true',
      STOP_SERVER_ON_CONTAINER_EXIT: 'false',
      JVM_XX_OPTS: '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC',
      ...(isModpack
        ? {
            MODPACK_PLATFORM: 'MODRINTH',
            MODRINTH_MODPACK: savedConfig.modpack,
            MODRINTH_VERSION_TYPE: 'release,beta,alpha',
            MODRINTH_ALLOWED_VERSION_TYPE: 'release,beta,alpha',
            MODRINTH_DEFAULT_VERSION_TYPE: 'alpha',
            VERSION_TYPE: 'release,beta,alpha',
            ...(savedConfig.modpackVersion && savedConfig.modpackVersion !== 'latest'
              ? { MODRINTH_VERSION: savedConfig.modpackVersion }
              : {}),
            ...(savedConfig.loader
              ? { MODRINTH_LOADER: savedConfig.loader.toLowerCase() }
              : {}),
          }
        : {
            TYPE: serverType,
          }),
      ...(options.environment || {}),
    };

    // Prevent conflicts between TYPE and MODPACK_PLATFORM
    if (isModpack) {
      delete envMap.TYPE;
      envMap.MODRINTH_VERSION_TYPE = 'release,beta,alpha';
      envMap.MODRINTH_ALLOWED_VERSION_TYPE = 'release,beta,alpha';
    } else {
      delete envMap.MODPACK_PLATFORM;
      delete envMap.MODRINTH_MODPACK;
      delete envMap.MODRINTH_VERSION;
      delete envMap.MODRINTH_LOADER;
      delete envMap.MODRINTH_VERSION_TYPE;
      delete envMap.MODRINTH_ALLOWED_VERSION_TYPE;
      delete envMap.MODRINTH_DEFAULT_VERSION_TYPE;
    }

    const envArray = Object.entries(envMap).map(([k, v]) => `${k}=${v}`);
    const portKey = `${port}/tcp`;

    // Host Config with Pterodactyl container lifecycle: RestartPolicy = 'no' so Docker never auto-restarts into crash loops
    const createPayload = {
      Image: image,
      Env: envArray,
      ExposedPorts: {
        [portKey]: {},
      },
      HostConfig: {
        PortBindings: {
          [portKey]: [{ HostIp: '0.0.0.0', HostPort: String(port) }],
        },
        Binds: [`${hostDataPath}:/data`],
        RestartPolicy: { Name: 'no' },
        MemoryReservation: memoryMb * 1024 * 1024,
        Memory: (memoryMb + 1024) * 1024 * 1024,
        MemorySwap: -1,
      },
      Tty: true,
      OpenStdin: true,
    };

    try {
      const created = await this.request(
        `/containers/create?name=${encodeURIComponent(containerName)}`,
        'POST',
        createPayload
      );

      if (created && created.Id) {
        if (options.startNow !== false) {
          await this.startContainer(created.Id);
        }
        return created;
      }
    } catch (err: any) {
      console.error(`[DockerService] Error creating container: ${err.message}`);
    }

    return null;
  }

  async startContainer(containerId: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      await this.request(`/containers/${containerId}/start`, 'POST');
      return true;
    } catch {
      return false;
    }
  }

  async stopContainer(containerId: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      await this.request(`/containers/${containerId}/stop`, 'POST');
      return true;
    } catch {
      return false;
    }
  }

  async restartContainer(containerId: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      await this.request(`/containers/${containerId}/restart`, 'POST');
      return true;
    } catch {
      return false;
    }
  }

  async killContainer(containerId: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      await this.request(`/containers/${containerId}/kill`, 'POST');
      return true;
    } catch {
      return false;
    }
  }

  async execCommand(containerId: string, cmd: string): Promise<string> {
    const cleanCmd = cmd.trim();
    if (!this.isAvailable() || !cleanCmd) return '';
    try {
      // Escape command for shell execution
      const escapedCmd = cleanCmd.replace(/(["\\$`])/g, '\\$1');
      const execObj = await this.request(`/containers/${containerId}/exec`, 'POST', {
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
        Cmd: [
          'sh',
          '-c',
          `rcon-cli --host 127.0.0.1 --port 25575 --password panelmaster-rcon "${escapedCmd}"`,
        ],
      });

      if (execObj && execObj.Id) {
        const out = await this.request(`/exec/${execObj.Id}/start`, 'POST', {
          Detach: false,
          Tty: false,
        });
        const outStr = typeof out === 'string' ? out.trim() : '';

        // If RCON connection refused (server is starting up, shutting down, or not ready yet)
        if (
          outStr.includes('connection refused') ||
          outStr.includes('Failed to connect to RCON') ||
          outStr.includes('dial tcp')
        ) {
          // Direct fallback to console stdin via PID 1
          try {
            await this.request(`/containers/${containerId}/exec`, 'POST', {
              AttachStdout: false,
              AttachStderr: false,
              Tty: false,
              Cmd: ['sh', '-c', `echo "${escapedCmd}" > /proc/1/fd/0 2>/dev/null || true`],
            });
          } catch {}

          return '\x1b[33m[PanelMaster]: El servidor aún se está iniciando o la consola no está lista para RCON. Espera unos segundos.\x1b[0m';
        }

        return outStr;
      }
    } catch (err: any) {
      console.error(`[DockerService] Exec error: ${err.message}`);
    }
    return '';
  }

  async getContainerStats(serviceId: string): Promise<ContainerStatsResult> {
    const containerName = `nexus-${serviceId}`;
    const container = await this.findContainerByName(containerName);

    // Calculate real disk usage from /var/lib/panelmaster/volumes/${serviceId}
    let diskUsageBytes = 0;
    let diskLimitBytes = 20 * 1024 * 1024 * 1024;
    const volPath = `/var/lib/panelmaster/volumes/${serviceId}`;
    try {
      if (fs.existsSync(volPath)) {
        const stats = (fs as any).statfsSync ? (fs as any).statfsSync(volPath) : null;
        if (stats) {
          diskLimitBytes = Number(stats.blocks) * Number(stats.bsize);
          const free = Number(stats.bfree) * Number(stats.bsize);
          diskUsageBytes = Math.max(0, diskLimitBytes - free);
        }
      }
    } catch {}

    const savedConfig = this.getServerConfig(serviceId);
    const configuredMemoryMb = savedConfig.memoryMb || 2048;
    const configuredMemoryLimitBytes = configuredMemoryMb * 1024 * 1024;

    if (!container || !this.isAvailable()) {
      return {
        cpuPercent: 0,
        memoryUsageBytes: 0,
        memoryLimitBytes: configuredMemoryLimitBytes,
        diskUsageBytes,
        diskLimitBytes,
        networkRxBytes: 0,
        networkTxBytes: 0,
        networkRxFormatted: '0 B/s',
        networkTxFormatted: '0 B/s',
        isOnline: false,
      };
    }

    try {
      const stats = await this.request(`/containers/${container.Id}/stats?stream=false`);
      if (!stats) throw new Error('No stats returned');

      // 1. CPU Usage %
      let cpuPercent = 0.0;
      const cpuDelta = (stats.cpu_stats?.cpu_usage?.total_usage || 0) - (stats.precpu_stats?.cpu_usage?.total_usage || 0);
      const systemDelta = (stats.cpu_stats?.system_cpu_usage || 0) - (stats.precpu_stats?.system_cpu_usage || 0);
      const onlineCpus = stats.cpu_stats?.online_cpus || stats.cpu_stats?.cpu_usage?.percpu_usage?.length || 1;

      if (systemDelta > 0 && cpuDelta > 0) {
        cpuPercent = (cpuDelta / systemDelta) * onlineCpus * 100.0;
      }

      // 2. Memory: Subtract Linux page cache (inactive_file) to get real active JVM memory
      const rawUsage = stats.memory_stats?.usage || 0;
      const inactiveFile =
        stats.memory_stats?.stats?.inactive_file ||
        stats.memory_stats?.stats?.total_inactive_file ||
        0;
      const memoryUsageBytes = Math.max(0, rawUsage - inactiveFile);
      const memoryLimitBytes = configuredMemoryLimitBytes;

      // 3. Network I/O
      let networkRxBytes = 0;
      let networkTxBytes = 0;
      if (stats.networks) {
        for (const net of Object.values(stats.networks) as any[]) {
          networkRxBytes += net.rx_bytes || 0;
          networkTxBytes += net.tx_bytes || 0;
        }
      }

      const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      };

      return {
        cpuPercent: Math.min(100, Math.max(0, Math.round(cpuPercent * 10) / 10)),
        memoryUsageBytes,
        memoryLimitBytes,
        diskUsageBytes,
        diskLimitBytes,
        networkRxBytes,
        networkTxBytes,
        networkRxFormatted: formatBytes(networkRxBytes),
        networkTxFormatted: formatBytes(networkTxBytes),
        isOnline: container.State === 'running',
      };
    } catch {
      return {
        cpuPercent: 0,
        memoryUsageBytes: 0,
        memoryLimitBytes: 2048 * 1024 * 1024,
        diskUsageBytes,
        diskLimitBytes,
        networkRxBytes: 0,
        networkTxBytes: 0,
        networkRxFormatted: '0 B/s',
        networkTxFormatted: '0 B/s',
        isOnline: false,
      };
    }
  }

  async getSystemOverviewStats(): Promise<SystemOverviewStats> {
    const containers = await this.listContainers();
    const runningContainers = containers.filter((c) => c.State === 'running');

    // Host CPU
    const cpus = os.cpus();
    const cpuCores = cpus.length || 8;
    const loadAvg = os.loadavg();
    const cpuUsageCores = Math.min(cpuCores, Math.max(0.02, Math.round((loadAvg[0] / cpuCores) * 100) / 100));
    const cpuUsagePercent = Math.min(100, Math.round((cpuUsageCores / cpuCores) * 100));

    // Host Memory
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Host Disk
    let diskTotalBytes = 100 * 1024 * 1024 * 1024;
    let diskUsedBytes = 15 * 1024 * 1024 * 1024;
    try {
      const stats = (fs as any).statfsSync ? (fs as any).statfsSync('/var/lib/panelmaster') : null;
      if (stats) {
        diskTotalBytes = Number(stats.blocks) * Number(stats.bsize);
        const free = Number(stats.bfree) * Number(stats.bsize);
        diskUsedBytes = Math.max(0, diskTotalBytes - free);
      }
    } catch {}

    // Aggregate Network across all containers
    let totalRx = 0;
    let totalTx = 0;
    for (const c of runningContainers.slice(0, 10)) {
      try {
        const s = await this.request(`/containers/${c.Id}/stats?stream=false`);
        if (s && s.networks) {
          for (const net of Object.values(s.networks) as any[]) {
            totalRx += net.rx_bytes || 0;
            totalTx += net.tx_bytes || 0;
          }
        }
      } catch {}
    }

    const formatBytes = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GiB`;
    };

    return {
      serverCount: containers.length,
      serversOnline: runningContainers.length,
      serversOffline: containers.length - runningContainers.length,
      cpuCores,
      cpuUsageCores,
      cpuUsagePercent,
      memoryUsedBytes: usedMem,
      memoryTotalBytes: totalMem,
      diskUsedBytes,
      diskTotalBytes,
      networkRxBytes: totalRx,
      networkTxBytes: totalTx,
      networkRateFormatted: `${formatBytes(totalRx / 60)}/s in • ${formatBytes(totalTx / 60)}/s out`,
      bandwidthTotalFormatted: `${formatBytes(totalRx + totalTx)}`,
    };
  }

  async getLogs(containerId: string, tail = 100): Promise<string> {
    if (!this.isAvailable()) return '';
    return new Promise((resolve) => {
      const req = http.request(
        {
          socketPath: this.socketPath,
          path: `/v1.43/containers/${containerId}/logs?stdout=1&stderr=1&tail=${tail}`,
          method: 'GET',
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            resolve('');
            return;
          }
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
          res.on('end', () => {
            const raw = Buffer.concat(chunks);
            let cleaned = '';
            let offset = 0;
            while (offset < raw.length) {
              if (raw.length - offset >= 8 && (raw[offset] === 1 || raw[offset] === 2) && raw[offset + 1] === 0) {
                const frameLen = raw.readUInt32BE(offset + 4);
                const frameStart = offset + 8;
                const frameEnd = Math.min(raw.length, frameStart + frameLen);
                cleaned += raw.subarray(frameStart, frameEnd).toString('utf-8');
                offset = frameEnd;
              } else {
                cleaned += raw.subarray(offset).toString('utf-8');
                break;
              }
            }
            if (cleaned.startsWith('{"message":')) {
              resolve('');
            } else {
              resolve(cleaned);
            }
          });
        }
      );
      req.on('error', () => resolve(''));
      req.end();
    });
  }

  streamLogs(
    containerId: string,
    onData: (chunk: string) => void,
    onEnd: () => void,
    tail = 0
  ): { abort: () => void } {
    if (!this.isAvailable()) {
      onEnd();
      return { abort: () => {} };
    }

    const req = http.request(
      {
        socketPath: this.socketPath,
        path: `/v1.43/containers/${containerId}/logs?follow=1&stdout=1&stderr=1&tail=${tail}`,
        method: 'GET',
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          onEnd();
          return;
        }

        res.on('data', (chunk) => {
          let str = chunk.toString('utf-8');
          if (chunk.length > 8 && (chunk[0] === 1 || chunk[0] === 2) && chunk[1] === 0 && chunk[2] === 0 && chunk[3] === 0) {
            str = chunk.slice(8).toString('utf-8');
          }
          if (str.startsWith('{"message":')) return;
          onData(str);
        });
        res.on('end', onEnd);
      }
    );

    req.on('error', () => onEnd());
    req.end();

    return {
      abort: () => {
        try {
          req.destroy();
        } catch {}
      },
    };
  }
}

export const dockerService = new DockerService();
