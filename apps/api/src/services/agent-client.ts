import axios, { AxiosInstance } from 'axios';

export interface CreateServiceAgentPayload {
  serviceId: string;
  image: string;
  command: string[];
  environment: string[];
  memoryBytes: number;
  nanoCpus: number;
  pidLimit: number;
  ports: Array<{
    hostPort: number;
    containerPort: number;
    protocol: 'tcp' | 'udp';
  }>;
  targetVolume?: string;
}

export class AgentClient {
  private client: AxiosInstance;
  private agentBaseUrl: string;
  private agentToken: string;

  constructor(host: string, port: number, token: string) {
    this.agentBaseUrl = `http://${host}:${port}`;
    this.agentToken = token;
    this.client = axios.create({
      baseURL: this.agentBaseUrl,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async getHealth() {
    const res = await this.client.get('/healthz');
    return res.data;
  }

  async getNodeStats() {
    const res = await this.client.get('/api/v1/node/stats');
    return res.data;
  }

  async createService(payload: CreateServiceAgentPayload) {
    const res = await this.client.post('/api/v1/services/create', payload);
    return res.data;
  }

  async stopService(containerId: string, serviceId: string) {
    const res = await this.client.post('/api/v1/services/stop', { containerId, serviceId });
    return res.data;
  }

  async restartService(containerId: string, serviceId: string) {
    const res = await this.client.post('/api/v1/services/restart', { containerId, serviceId });
    return res.data;
  }

  async deleteService(containerId: string, serviceId: string) {
    const res = await this.client.post('/api/v1/services/delete', { containerId, serviceId });
    return res.data;
  }

  async listFiles(serviceId: string, path: string = '') {
    const res = await this.client.get('/api/v1/services/files/list', {
      params: { serviceId, path },
    });
    return res.data;
  }

  async readFile(serviceId: string, path: string) {
    const res = await this.client.get('/api/v1/services/files/read', {
      params: { serviceId, path },
      responseType: 'text',
    });
    return res.data;
  }

  async writeFile(serviceId: string, path: string, content: string) {
    const res = await this.client.post('/api/v1/services/files/write', content, {
      params: { serviceId, path },
      headers: { 'Content-Type': 'text/plain' },
    });
    return res.data;
  }

  async deleteFile(serviceId: string, path: string) {
    const res = await this.client.post('/api/v1/services/files/delete', null, {
      params: { serviceId, path },
    });
    return res.data;
  }

  getConsoleWsUrl(containerId: string): string {
    const wsBase = this.agentBaseUrl.replace(/^http/, 'ws');
    return `${wsBase}/api/v1/services/console?containerId=${containerId}&token=${encodeURIComponent(this.agentToken)}`;
  }
}
