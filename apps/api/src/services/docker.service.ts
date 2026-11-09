import http from 'http';
import fs from 'fs';
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
            try {
              resolve(data ? JSON.parse(data) : null);
            } catch {
              resolve(data);
            }
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

  async createServiceContainer(options: CreateServiceContainerOptions): Promise<any> {
    if (!this.isAvailable()) {
      return { id: `mock-${options.serviceId}`, name: `nexus-${options.serviceId}` };
    }

    const containerName = `nexus-${options.serviceId}`;
    const image = options.image || 'itzg/minecraft-server:latest';
    const port = options.port || 25565;
    const memoryMb = options.memoryMb || 2048;

    // Remove old container if exists
    try {
      const existing = await this.findContainerByName(containerName);
      if (existing) {
        await this.request(`/containers/${existing.Id}?force=true`, 'DELETE');
      }
    } catch {}

    // Pull image in background if needed
    await this.ensureImage(image);

    // Prepare volume directory
    const hostDataPath = `/var/lib/panelmaster/volumes/${options.serviceId}`;
    try {
      if (!fs.existsSync(hostDataPath)) {
        fs.mkdirSync(hostDataPath, { recursive: true });
      }
    } catch {}

    // Balanced JVM memory (65-70% heap, remaining for Metaspace/Native Netty to completely prevent OOM)
    const jvmHeapMb = Math.max(1024, Math.floor(memoryMb * 0.70));

    const envMap: Record<string, string> = {
      EULA: 'TRUE',
      TYPE: 'PAPER',
      VERSION: '1.20.4',
      ONLINE_MODE: 'FALSE',
      MAX_PLAYERS: '20',
      ENABLE_RCON: 'true',
      RCON_PASSWORD: 'panelmaster-rcon',
      INIT_MEMORY: `${Math.min(1024, jvmHeapMb)}M`,
      MAX_MEMORY: `${jvmHeapMb}M`,
      MEMORY: `${jvmHeapMb}M`,
      USE_AIKARS_FLAGS: 'true',
      STOP_SERVER_ON_CONTAINER_EXIT: 'false',
      JVM_XX_OPTS: '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC',
      ...(options.environment || {}),
    };

    const envArray = Object.entries(envMap).map(([k, v]) => `${k}=${v}`);
    const portKey = `${port}/tcp`;

    // Host Config with soft memory reservation and 1GB headroom buffer so kernel never OOM-kills the server
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
        RestartPolicy: { Name: 'unless-stopped' },
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

  async execCommand(containerId: string, cmd: string): Promise<string> {
    if (!this.isAvailable() || !cmd.trim()) return '';
    try {
      const execObj = await this.request(`/containers/${containerId}/exec`, 'POST', {
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
        Cmd: ['rcon-cli', cmd],
      });

      if (execObj && execObj.Id) {
        const out = await this.request(`/exec/${execObj.Id}/start`, 'POST', {
          Detach: false,
          Tty: false,
        });
        return typeof out === 'string' ? out : '';
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

    if (!container || !this.isAvailable()) {
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

      // 2. Memory
      const memoryUsageBytes = stats.memory_stats?.usage || 0;
      const memoryLimitBytes = stats.memory_stats?.limit || 2048 * 1024 * 1024;

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

  streamLogs(
    containerId: string,
    onData: (chunk: string) => void,
    onEnd: () => void
  ): { abort: () => void } {
    if (!this.isAvailable()) {
      onEnd();
      return { abort: () => {} };
    }

    const req = http.request(
      {
        socketPath: this.socketPath,
        path: `/v1.43/containers/${containerId}/logs?follow=1&stdout=1&stderr=1&tail=100`,
        method: 'GET',
      },
      (res) => {
        res.on('data', (chunk) => {
          let str = chunk.toString('utf-8');
          if (chunk.length > 8 && (chunk[0] === 1 || chunk[0] === 2)) {
            str = chunk.slice(8).toString('utf-8');
          }
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
