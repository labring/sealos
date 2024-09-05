import JsYaml from 'js-yaml';

export interface ResourceUsage {
  cpu: { min: number; max: number }; // m
  memory: { min: number; max: number }; // Mi
  storage: { min: number; max: number }; // Mi
  nodeport: number;
}

export function getResourceUsage(yamlList: string[]): ResourceUsage {
  let totalCpuMin = 0;
  let totalCpuMax = 0;
  let totalMemoryMin = 0;
  let totalMemoryMax = 0;
  let totalStorageMin = 0;
  let totalStorageMax = 0;
  let totalNodeport = 0;

  for (const yaml of yamlList) {
    for (const yamlObj of JsYaml.loadAll(yaml)) {
      const resource = parseResourceUsage(yamlObj);
      totalCpuMin += resource.cpu.min;
      totalCpuMax += resource.cpu.max;
      totalMemoryMin += resource.memory.min;
      totalMemoryMax += resource.memory.max;
      totalStorageMin += resource.storage.min;
      totalStorageMax += resource.storage.max;
      totalNodeport += resource.nodeport;
    }
  }

  return {
    cpu: { min: totalCpuMin, max: totalCpuMax },
    memory: { min: totalMemoryMin, max: totalMemoryMax },
    storage: { min: totalStorageMin, max: totalStorageMax },
    nodeport: totalNodeport
  };
}

function parseResourceUsage(yamlObj: any): ResourceUsage {
  const kind = yamlObj?.kind;

  let cpu = 0;
  let memory = 0;
  let storage = 0;
  let nodeport = 0;

  let replicasMin =
    parseInt(
      yamlObj.metadata?.annotations?.['deploy.cloud.sealos.io/minReplicas'] ??
        yamlObj.spec?.replicas?.toString() ??
        '1'
    ) || 1;
  if (replicasMin === 0) replicasMin = 1;
  let replicasMax =
    parseInt(
      yamlObj.metadata?.annotations?.['deploy.cloud.sealos.io/maxReplicas'] ??
        yamlObj.spec?.replicas?.toString() ??
        '1'
    ) || replicasMin;
  if (replicasMin > replicasMax) {
    replicasMax = replicasMin;
  }

  if (kind === 'Deployment' || kind === 'StatefulSet') {
    const containers = yamlObj.spec?.template?.spec?.containers;
    if (containers) {
      for (const container of containers) {
        cpu += convertCpu(container.resources?.limits?.cpu || '0m');
        memory += convertMemory(container.resources?.limits?.memory || '0');
      }
    }

    if (yamlObj.spec?.volumeClaimTemplates) {
      for (const volumeClaim of yamlObj.spec?.volumeClaimTemplates) {
        storage += convertMemory(volumeClaim.spec?.resources?.requests?.storage || '0');
      }
    }
  } else if (kind === 'Service' && yamlObj.spec?.type === 'NodePort') {
    nodeport = yamlObj.spec.ports?.length || 0;
  }

  return {
    cpu: { min: cpu * replicasMin, max: cpu * replicasMax },
    memory: { min: memory * replicasMin, max: memory * replicasMax },
    storage: {
      min: storage * replicasMin,
      max: storage * replicasMax
    },
    nodeport: nodeport
  };
}

function convertCpu(cpu: string): number {
  cpu = String(cpu);
  if (cpu.slice(-1) === 'm') {
    return parseFloat(cpu.slice(0, -1)) || 0;
  } else {
    return parseFloat(cpu) * 1000 || 0;
  }
}

// https://kubernetes.io/zh-cn/docs/tasks/configure-pod-container/assign-memory-resource/#memory-units
function convertMemory(memory: string): number {
  memory = String(memory);
  const memoryValue = parseFloat(memory) || 0;

  switch (memory.replace(/[0-9.]/g, '')) {
    case 'E':
      return (memoryValue * 1000 * 1000 * 1000 * 1000) / (1024 * 1024);
    case 'Ei':
      return memoryValue * 1024 * 1024 * 1024 * 1024;
    case 'P':
      return (memoryValue * 1000 * 1000 * 1000) / (1024 * 1024);
    case 'Pi':
      return memoryValue * 1024 * 1024 * 1024;
    case 'T':
      return (memoryValue * 1000 * 1000) / (1024 * 1024);
    case 'Ti':
      return memoryValue * 1024 * 1024;
    case 'G':
      return (memoryValue * 1000) / 1024;
    case 'Gi':
      return memoryValue * 1024;
    case 'M':
      return (memoryValue * 1000 * 1000) / (1024 * 1024);
    case 'Mi':
      return memoryValue;
    case 'K':
      return memoryValue / 1000 / 1024;
    case 'Ki':
      return memoryValue / 1024;
    default:
      return memoryValue / (1024 * 1024); // Convert bytes to MiB
  }
}
