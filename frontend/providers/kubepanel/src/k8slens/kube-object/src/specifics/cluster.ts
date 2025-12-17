import { KubeObjectMetadata, KubeObjectScope } from '../api-types';
import { KubeObject } from '../kube-object';

export interface ClusterComponentSpec {
  componentDefRef?: string;
  name?: string;
  replicas?: number;
  resources?: {
    limits?: { cpu?: string; memory?: string };
    requests?: { cpu?: string; memory?: string };
  };
  volumeClaimTemplates?: Array<{
    name?: string;
    spec?: {
      resources?: {
        requests?: { storage?: string };
      };
    };
  }>;
}

export interface ClusterSpec {
  clusterDefinitionRef?: string;
  clusterVersionRef?: string;
  terminationPolicy?: string;
  componentSpecs?: ClusterComponentSpec[];
  backup?: {
    enabled?: boolean;
    cronExpression?: string;
    method?: string;
  };
}

export interface ClusterComponentStatus {
  phase?: string;
  podsReady?: boolean;
}

export interface ClusterStatus {
  phase?: string;
  components?: Record<string, ClusterComponentStatus>;
  conditions?: Array<{
    type?: string;
    status?: string;
    reason?: string;
    message?: string;
  }>;
}

export class Cluster extends KubeObject<
  KubeObjectMetadata<KubeObjectScope.Namespace>,
  ClusterStatus,
  ClusterSpec
> {
  static readonly kind = 'Cluster';
  static readonly namespaced = true;
  static readonly apiBase = '/apis/apps.kubeblocks.io/v1alpha1/clusters';

  getPhase(): string {
    return this.status?.phase || 'Unknown';
  }

  getClusterDefinition(): string {
    return this.spec?.clusterDefinitionRef || '';
  }

  getClusterVersion(): string {
    return this.spec?.clusterVersionRef || '';
  }

  getTerminationPolicy(): string {
    return this.spec?.terminationPolicy || '';
  }

  getReplicas(): number {
    return this.spec?.componentSpecs?.[0]?.replicas || 0;
  }

  getCpu(): string {
    return this.spec?.componentSpecs?.[0]?.resources?.limits?.cpu || '';
  }

  getMemory(): string {
    return this.spec?.componentSpecs?.[0]?.resources?.limits?.memory || '';
  }

  getStorage(): string {
    return (
      this.spec?.componentSpecs?.[0]?.volumeClaimTemplates?.[0]?.spec?.resources?.requests
        ?.storage || ''
    );
  }

  isBackupEnabled(): boolean {
    return this.spec?.backup?.enabled || false;
  }

  getComponentPhase(componentName: string): string {
    return this.status?.components?.[componentName]?.phase || '';
  }
}
