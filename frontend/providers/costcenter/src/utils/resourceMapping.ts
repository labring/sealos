import { ValuationStandard } from '@/types/valuation';
import { valuationMap } from '@/constants/payment';

export type ResourceConfig = {
  name: string;
  alias?: string;
  unit: string;
  scale: number;
  bg: string;
  resourceType: 'cpu' | 'memory' | 'storage' | 'gpu' | 'network' | 'services.nodeports';
};

/**
 * Build dynamic resource index mapping from properties data
 */
export function buildResourceIndexMap(
  properties: ValuationStandard[]
): Map<number, ResourceConfig> {
  const indexMap = new Map<number, ResourceConfig>();

  properties.forEach((prop) => {
    let resourceType: ResourceConfig['resourceType'] = 'cpu';
    let valuationConfig = valuationMap.get(
      prop.name as 'cpu' | 'memory' | 'storage' | 'gpu' | 'network' | 'services.nodeports'
    );

    // Handle GPU resources with pattern gpu-xxx
    if (!valuationConfig && prop.name.startsWith('gpu-')) {
      resourceType = 'gpu';
      valuationConfig = valuationMap.get('gpu');
    } else if (prop.name === 'cpu') {
      resourceType = 'cpu';
    } else if (prop.name === 'memory') {
      resourceType = 'memory';
    } else if (prop.name === 'storage') {
      resourceType = 'storage';
    } else if (prop.name === 'network') {
      resourceType = 'network';
    } else if (prop.name === 'services.nodeports') {
      resourceType = 'services.nodeports';
    }

    if (valuationConfig) {
      indexMap.set(prop.enum, {
        name: prop.name,
        alias: prop.alias,
        unit: valuationConfig.unit,
        scale: valuationConfig.scale,
        bg: valuationConfig.bg,
        resourceType: resourceType
      });
    }
  });

  return indexMap;
}

/**
 * Get formatted resource display value with unit conversion
 */
export function getResourceDisplayValue(
  value: number,
  enumIndex: number,
  resourceMap: Map<number, ResourceConfig>
): string {
  const resource = resourceMap.get(enumIndex);
  if (!resource || !value || isNaN(value)) return '-';

  const displayValue = value / resource.scale;
  return `${displayValue}`;
}

/**
 * Get resource unit string
 */
export function getResourceUnit(
  enumIndex: number,
  resourceMap: Map<number, ResourceConfig>
): string {
  const resource = resourceMap.get(enumIndex);
  return resource?.unit || '';
}

/**
 * Get resource configuration
 */
export function getResourceConfig(
  enumIndex: number,
  resourceMap: Map<number, ResourceConfig>
): ResourceConfig | undefined {
  return resourceMap.get(enumIndex);
}

/**
 * Get sorted resources by index
 */
export function getSortedResources(
  resourceMap: Map<number, ResourceConfig>
): Array<[number, ResourceConfig]> {
  return Array.from(resourceMap.entries()).sort(([a], [b]) => a - b);
}
