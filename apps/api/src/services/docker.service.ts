import http from 'http';
import fs from 'fs';

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

export class DockerService {
  private socketPath = '/var/run/docker.sock';

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
      // Check if image exists locally
      const inspect = await this.request(`/images/${encodeURIComponent(image)}/json`);
      if (inspect && inspect.Id) return true;
    } catch {}

    // Pull image if not found locally
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

    // Build environment variables
    const envMap: Record<string, string> = {
      EULA: 'TRUE',
      TYPE: 'PAPER',
      VERSION: '1.20.4',
      ONLINE_MODE: 'FALSE', // Allow easy connections for testing and cracked/premium players
      MAX_PLAYERS: '20',
      ENABLE_RCON: 'true',
      RCON_PASSWORD: 'panelmaster-rcon',
      MEMORY: `${Math.max(1024, Math.floor(memoryMb * 0.85))}M`,
      ...(options.environment || {}),
    };

    const envArray = Object.entries(envMap).map(([k, v]) => `${k}=${v}`);
    const portKey = `${port}/tcp`;

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
        Memory: memoryMb * 1024 * 1024,
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
      // For minecraft itzg images, rcon-cli is built-in and sends commands to live server
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
        path: `/v1.43/containers/${containerId}/logs?follow=1&stdout=1&stderr=1&tail=80`,
        method: 'GET',
      },
      (res) => {
        res.on('data', (chunk) => {
          // Docker multiplexed log stream has an 8-byte header per frame
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
