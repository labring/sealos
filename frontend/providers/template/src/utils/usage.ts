import JsYaml from 'js-yaml';

export interface ResourceUsage {
  cpu: { min: number; max: number };
  memory: { min: number; max: number };
  storage: { min: number; max: number };
  nodeport: { min: number; max: number };
}

export function getResourceUsage(yamlList: string[]): ResourceUsage {
  let totalCpuMin = 0;
  let totalCpuMax = 0;
  let totalMemoryMin = 0;
  let totalMemoryMax = 0;
  let totalStorageMin = 0;
  let totalStorageMax = 0;
  let totalNodeportMin = 0;
  let totalNodeportMax = 0;

  for (const yaml of yamlList) {
    for (const yamlObj of JsYaml.loadAll(yaml)) {
      const resource = parseResourceUsage(yamlObj);
      totalCpuMin += resource.cpu.min;
      totalCpuMax += resource.cpu.max;
      totalMemoryMin += resource.memory.min;
      totalMemoryMax += resource.memory.max;
      totalStorageMin += resource.storage.min;
      totalStorageMax += resource.storage.max;
      totalNodeportMin += resource.nodeport.min;
      totalNodeportMax += resource.nodeport.max;
    }
  }

  return {
    cpu: { min: totalCpuMin, max: totalCpuMax },
    memory: { min: totalMemoryMin, max: totalMemoryMax },
    storage: { min: totalStorageMin, max: totalStorageMax },
    nodeport: { min: totalNodeportMin, max: totalNodeportMax }
  };
}

function parseResourceUsage(yamlObj: any): ResourceUsage {
  const kind = yamlObj.kind;

  let cpuMin = 0;
  let cpuMax = 0;
  let memoryMin = 0;
  let memoryMax = 0;
  let storageMin = 0;
  let storageMax = 0;
  let nodeportMin = 0;
  let nodeportMax = 0;

  let replicasMin = 1;
  let replicasMax = 1;

  if (kind === 'Deployment' || kind === 'StatefulSet') {
    const containers = yamlObj.spec.template.spec.containers;
    for (const container of containers) {
      cpuMin += convertCpu(container.resources.requests?.cpu || '0m');
      cpuMax += convertCpu(container.resources.limits?.cpu || '0m');
      memoryMin += convertMemory(container.resources.requests?.memory || '0');
      memoryMax += convertMemory(container.resources.limits?.memory || '0');
    }

    if (kind === 'Deployment') {
      replicasMin = parseInt(
        yamlObj.metadata.annotations['deploy.cloud.sealos.io/minReplicas'] ||
          yamlObj.spec.replicas?.toString() ||
          '1'
      );
      replicasMax = parseInt(
        yamlObj.metadata.annotations['deploy.cloud.sealos.io/maxReplicas'] ||
          yamlObj.spec.replicas?.toString() ||
          '1'
      );
    } else if (kind === 'StatefulSet') {
      replicasMin = replicasMax = parseInt(yamlObj.spec.replicas?.toString() || '1');
    }

    if (yamlObj.spec.volumeClaimTemplates) {
      for (const volumeClaim of yamlObj.spec.volumeClaimTemplates) {
        storageMin += convertMemory(volumeClaim.spec.resources.requests?.storage || '0');
        storageMax += convertMemory(volumeClaim.spec.resources.requests?.storage || '0');
      }
    }
  } else if (kind === 'Service' && yamlObj.spec.type === 'NodePort') {
    nodeportMin = nodeportMax = yamlObj.spec.ports?.length || 0;
  }

  return {
    cpu: { min: cpuMin * replicasMin, max: cpuMax * replicasMax },
    memory: { min: memoryMin * replicasMin, max: memoryMax * replicasMax },
    storage: {
      min: storageMin * replicasMin,
      max: storageMax * replicasMax
    },
    nodeport: { min: nodeportMin, max: nodeportMax }
  };
}

function convertCpu(cpu: string): number {
  const cpuValue = parseFloat(cpu.slice(0, -1));
  const cpuUnit = cpu.slice(-1);
  if (cpuUnit === 'm') {
    return cpuValue;
  } else {
    return cpuValue * 1000; // Convert to millicores
  }
}

function convertMemory(memory: string): number {
  const memoryValue = parseFloat(memory.slice(0, -2));
  const memoryUnit = memory.slice(-2);
  switch (memoryUnit) {
    case 'Ki':
      return memoryValue / 1024;
    case 'Mi':
      return memoryValue;
    case 'Gi':
      return memoryValue * 1024;
    case 'Ti':
      return memoryValue * 1024 * 1024;
    case 'Pi':
      return memoryValue * 1024 * 1024 * 1024;
    case 'Ei':
      return memoryValue * 1024 * 1024 * 1024 * 1024;
    default:
      return memoryValue / (1024 * 1024); // Convert bytes to Mi
  }
}
