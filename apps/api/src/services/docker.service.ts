import http from 'http';
import fs from 'fs';

export class DockerService {
  private socketPath = '/var/run/docker.sock';

  isAvailable(): boolean {
    try {
      return fs.existsSync(this.socketPath);
    } catch {
      return false;
    }
  }

  private request(path: string, method = 'GET', body?: any): Promise<any> {
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
    return list.find((c) => c.Names?.some((n: string) => n.includes(name))) || null;
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
        path: `/v1.43/containers/${containerId}/logs?follow=1&stdout=1&stderr=1&tail=50`,
        method: 'GET',
      },
      (res) => {
        res.on('data', (chunk) => {
          // Docker raw stream has 8-byte header per frame; slice it off if binary
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
