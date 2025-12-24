import { KubeObjectMetadata, KubeObjectScope } from '../api-types';
import { KubeObject } from '../kube-object';

export interface DevboxSpec {
  state?: string;
  resource?: {
    cpu?: string;
    memory?: string;
  };
  image?: string;
  runtimeClassName?: string;
  storageLimit?: string;
  templateID?: string;
  network?: {
    type?: string;
  };
  config?: {
    user?: string;
    workingDir?: string;
    appPorts?: Array<{
      name: string;
      port: number;
      protocol?: string;
    }>;
    ports?: Array<{
      containerPort: number;
      name: string;
      protocol?: string;
    }>;
  };
}

export interface DevboxStatus {
  phase?: string;
  state?: string;
  node?: string;
  network?: {
    type?: string;
    nodePort?: number;
    tailnet?: string;
  };
  lastContainerStatus?: {
    image?: string;
    name?: string;
    ready?: boolean;
    restartCount?: number;
    started?: boolean;
    state?: {
      running?: { startedAt?: string };
      waiting?: { reason?: string; message?: string };
      terminated?: { reason?: string; exitCode?: number };
    };
  };
  contentID?: string;
}

export class Devbox extends KubeObject<
  KubeObjectMetadata<KubeObjectScope.Namespace>,
  DevboxStatus,
  DevboxSpec
> {
  static readonly kind = 'Devbox';
  static readonly namespaced = true;
  static readonly apiBase = '/apis/devbox.sealos.io/v1alpha2/devboxes';

  getPhase(): string {
    return this.status?.phase || 'Unknown';
  }

  getState(): string {
    const statusState = this.status?.state;
    const specState = this.spec?.state;

    // If status.state is a string, use it
    if (typeof statusState === 'string') {
      return statusState;
    }

    // If status.state is an object (container state), extract the state key
    if (statusState && typeof statusState === 'object') {
      if ('running' in statusState) return 'Running';
      if ('waiting' in statusState) return 'Waiting';
      if ('terminated' in statusState) return 'Terminated';
    }

    // Fallback to spec.state or default
    if (typeof specState === 'string') {
      return specState;
    }

    return 'Unknown';
  }

  getImage(): string {
    return this.spec?.image || '';
  }

  getRuntimeClassName(): string {
    return this.spec?.runtimeClassName || '';
  }

  getCpu(): string {
    return this.spec?.resource?.cpu || '';
  }

  getMemory(): string {
    return this.spec?.resource?.memory || '';
  }

  getStorageLimit(): string {
    return this.spec?.storageLimit || '';
  }

  getNode(): string {
    return this.status?.node || '';
  }

  getNodePort(): number | undefined {
    return this.status?.network?.nodePort;
  }

  getNetworkType(): string {
    return this.status?.network?.type || this.spec?.network?.type || '';
  }

  getContainerStatus(): string {
    const state = this.status?.lastContainerStatus?.state;
    if (state?.running) return 'Running';
    if (state?.waiting) return state.waiting.reason || 'Waiting';
    if (state?.terminated) return state.terminated.reason || 'Terminated';
    return '';
  }

  getUser(): string {
    return this.spec?.config?.user || '';
  }

  getWorkingDir(): string {
    return this.spec?.config?.workingDir || '';
  }

  getAppPorts(): Array<{ name: string; port: number; protocol?: string }> {
    return this.spec?.config?.appPorts || [];
  }

  getSshPort(): number | undefined {
    const sshPort = this.spec?.config?.ports?.find((p) => p.name === 'devbox-ssh-port');
    return sshPort?.containerPort;
  }
}
