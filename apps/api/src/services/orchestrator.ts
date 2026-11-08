import { prisma } from '../prisma';
import { AgentClient } from './agent-client';

export interface DeployOptions {
  serviceId: string;
  preferredRegionId?: string;
  portsRequired: Array<{ containerPort: number; protocol: 'tcp' | 'udp' }>;
}

export class Orchestrator {
  /**
   * Schedule finds the best node with available capacity and free ports
   */
  async selectOptimalNode(requiredMemoryBytes: bigint, preferredRegionId?: string) {
    const nodes = await prisma.node.findMany({
      where: {
        status: 'ONLINE',
        isUnderMaintenance: false,
        ...(preferredRegionId ? { regionId: preferredRegionId } : {}),
      },
      include: {
        portAllocations: true,
      },
    });

    if (nodes.length === 0) {
      throw new Error('No available online nodes found to schedule workload');
    }

    // Rank nodes by available memory with overcommit
    const ranked = nodes
      .map((node) => {
        const effectiveLimit = BigInt(Math.floor(Number(node.memoryTotalBytes) * node.memOvercommitRatio));
        const freeMemory = effectiveLimit - node.memoryAllocated;
        return { node, freeMemory };
      })
      .filter((n) => n.freeMemory >= requiredMemoryBytes)
      .sort((a, b) => (b.freeMemory > a.freeMemory ? 1 : -1));

    if (ranked.length === 0) {
      throw new Error('Insufficient node capacity across cluster');
    }

    return ranked[0].node;
  }

  /**
   * Allocate ports for the service on the node
   */
  async allocatePorts(nodeId: string, ports: Array<{ containerPort: number; protocol: 'tcp' | 'udp' }>) {
    // Find free ports between 10000 and 40000
    const allocations: Array<{ hostPort: number; containerPort: number; protocol: 'tcp' | 'udp' }> = [];

    for (const p of ports) {
      const existing = await prisma.portAllocation.findMany({
        where: { nodeId },
        select: { port: true },
      });
      const usedPorts = new Set(existing.map((x) => x.port));

      let candidatePort = 25565; // Default trial for games, otherwise search
      if (usedPorts.has(candidatePort)) {
        candidatePort = 10000 + Math.floor(Math.random() * 20000);
        while (usedPorts.has(candidatePort)) {
          candidatePort++;
        }
      }

      allocations.push({
        hostPort: candidatePort,
        containerPort: p.containerPort,
        protocol: p.protocol,
      });
    }

    return allocations;
  }

  /**
   * Deploy workload onto chosen node
   */
  async deployService(serviceId: string) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        templateVersion: true,
        environmentVars: true,
        secrets: true,
      },
    });

    if (!service) throw new Error('Service not found');

    const node = await this.selectOptimalNode(service.memoryLimitBytes);

    // Required ports from template or defaults
    const ports = await this.allocatePorts(node.id, [
      { containerPort: 25565, protocol: 'tcp' },
    ]);

    // Build environment variables array
    const envVars = [
      ...service.environmentVars.map((v) => `${v.key}=${v.value}`),
      `NEXUS_SERVICE_ID=${service.id}`,
    ];

    // Communicate with node agent
    const agent = new AgentClient(node.fqdn, node.agentPort, 'nexus-dev-secret-token');

    const result = await agent.createService({
      serviceId: service.id,
      image: service.templateVersion.dockerImage,
      command: service.templateVersion.startupCommand ? service.templateVersion.startupCommand.split(' ') : [],
      environment: envVars,
      memoryBytes: Number(service.memoryLimitBytes),
      nanoCpus: Math.floor(service.cpuLimitCores * 1e9),
      pidLimit: service.pidLimit,
      ports: ports.map((p) => ({
        hostPort: p.hostPort,
        containerPort: p.containerPort,
        protocol: p.protocol,
      })),
      targetVolume: '/data',
    });

    // Save instance in DB
    const instance = await prisma.serviceInstance.create({
      data: {
        serviceId: service.id,
        nodeId: node.id,
        containerId: result.containerId,
        containerName: `nexus-${service.id}`,
        hostDataPath: `/var/lib/nexuspanel/volumes/${service.id}`,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // Record Port Allocations
    for (const p of ports) {
      await prisma.portAllocation.create({
        data: {
          nodeId: node.id,
          port: p.hostPort,
          protocol: p.protocol.toUpperCase() as any,
          serviceInstanceId: instance.id,
          isPrimary: true,
          assignedAt: new Date(),
        },
      });
    }

    // Update node allocated memory
    await prisma.node.update({
      where: { id: node.id },
      data: {
        memoryAllocated: { increment: service.memoryLimitBytes },
        diskAllocated: { increment: service.diskLimitBytes },
      },
    });

    // Update service status
    await prisma.service.update({
      where: { id: service.id },
      data: { status: 'RUNNING' },
    });

    return instance;
  }
}
