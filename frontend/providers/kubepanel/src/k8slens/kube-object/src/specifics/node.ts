/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { isObject, cpuUnitsToNumber, unitsToBytes } from '@//k8slens/utilities';
import { TypedRegEx } from 'typed-regex';
import type { BaseKubeObjectCondition, ClusterScopedMetadata } from '../api-types';
import { KubeObject } from '../kube-object';

export interface NodeTaint {
  key: string;
  value?: string;
  effect: string;
  timeAdded: string;
}

export function formatNodeTaint(taint: NodeTaint): string {
  if (taint.value) {
    return `${taint.key}=${taint.value}:${taint.effect}`;
  }

  return `${taint.key}:${taint.effect}`;
}

export interface NodeCondition extends BaseKubeObjectCondition {
  /**
   * Last time we got an update on a given condition.
   */
  lastHeartbeatTime?: string;
}

/**
 * These role label prefixs are the ones that are for master nodes
 *
 * The `master` label has been deprecated in Kubernetes 1.20, and will be removed in 1.25 so we
 * have to also use the newer `control-plane` label
 */
const masterNodeLabels = ['master', 'control-plane'];

/**
 * This regex is used in the `getRoleLabels()` method bellow, but placed here
 * as factoring out regexes is best practice.
 */
// eslint-disable-next-line xss/no-mixed-html
const nodeRoleLabelKeyMatcher = TypedRegEx('^.*node-role.kubernetes.io/+(?<role>.+)$');

export interface NodeSpec {
  podCIDR?: string;
  podCIDRs?: string[];
  providerID?: string;
  /**
   * @deprecated see https://issues.k8s.io/61966
   */
  externalID?: string;
  taints?: NodeTaint[];
  unschedulable?: boolean;
}

export interface NodeAddress {
  type: 'Hostname' | 'ExternalIP' | 'InternalIP';
  address: string;
}

export interface NodeStatusResources extends Partial<Record<string, string>> {
  cpu?: string;
  'ephemeral-storage'?: string;
  'hugepages-1Gi'?: string;
  'hugepages-2Mi'?: string;
  memory?: string;
  pods?: string;
}

export interface ConfigMapNodeConfigSource {
  kubeletConfigKey: string;
  name: string;
  namespace: string;
  resourceVersion?: string;
  uid?: string;
}

export interface NodeConfigSource {
  configMap?: ConfigMapNodeConfigSource;
}

export interface NodeConfigStatus {
  active?: NodeConfigSource;
  assigned?: NodeConfigSource;
  lastKnownGood?: NodeConfigSource;
  error?: string;
}

export interface DaemonEndpoint {
  Port: number; //it must be uppercase for backwards compatibility
}

export interface NodeDaemonEndpoints {
  kubeletEndpoint?: DaemonEndpoint;
}

export interface ContainerImage {
  names?: string[];
  sizeBytes?: number;
}

export interface NodeSystemInfo {
  architecture: string;
  bootID: string;
  containerRuntimeVersion: string;
  kernelVersion: string;
  kubeProxyVersion: string;
  kubeletVersion: string;
  machineID: string;
  operatingSystem: string;
  osImage: string;
  systemUUID: string;
}

export interface AttachedVolume {
  name: string;
  devicePath: string;
}

export interface NodeStatus {
  capacity?: NodeStatusResources;
  allocatable?: NodeStatusResources;
  conditions?: NodeCondition[];
  addresses?: NodeAddress[];
  config?: NodeConfigStatus;
  daemonEndpoints?: NodeDaemonEndpoints;
  images?: ContainerImage[];
  nodeInfo?: NodeSystemInfo;
  phase?: string;
  volumesInUse?: string[];
  volumesAttached?: AttachedVolume[];
}

export class Node extends KubeObject<ClusterScopedMetadata, NodeStatus, NodeSpec> {
  static readonly kind = 'Node';

  static readonly namespaced = false;

  static readonly apiBase = '/api/v1/nodes';

  /**
   * Returns the concatination of all current condition types which have a status
   * of `"True"`
   */
  getNodeConditionText(): string {
    if (!this.status?.conditions) {
      return '';
    }

    return this.status.conditions
      .filter((condition) => condition.status === 'True')
      .map((condition) => condition.type)
      .join(' ');
  }

  getTaints() {
    return this.spec.taints || [];
  }

  isMasterNode(): boolean {
    return this.getRoleLabelItems().some((roleLabel) => masterNodeLabels.includes(roleLabel));
  }

  getRoleLabelItems(): string[] {
    const { labels } = this.metadata;
    const roleLabels: string[] = [];

    if (!isObject(labels)) {
      return roleLabels;
    }

    for (const labelKey of Object.keys(labels)) {
      const match = nodeRoleLabelKeyMatcher.match(labelKey);

      if (match?.groups) {
        roleLabels.push(match.groups.role);
      }
    }

    if (typeof labels['kubernetes.io/role'] === 'string') {
      roleLabels.push(labels['kubernetes.io/role']);
    }

    if (typeof labels['node.kubernetes.io/role'] === 'string') {
      roleLabels.push(labels['node.kubernetes.io/role']);
    }

    return roleLabels;
  }

  getRoleLabels(): string {
    return this.getRoleLabelItems().join(', ');
  }

  getCpuCapacity() {
    if (!this.status?.capacity || !this.status.capacity.cpu) {
      return 0;
    }

    return cpuUnitsToNumber(this.status.capacity.cpu);
  }

  getMemoryCapacity() {
    if (!this.status?.capacity || !this.status.capacity.memory) {
      return 0;
    }

    return unitsToBytes(this.status.capacity.memory);
  }

  getConditions(): NodeCondition[] {
    const conditions = this.status?.conditions || [];

    if (this.isUnschedulable()) {
      return [{ type: 'SchedulingDisabled', status: 'True' }, ...conditions];
    }

    return conditions;
  }

  getActiveConditions() {
    return this.getConditions().filter((c) => c.status === 'True');
  }

  getWarningConditions() {
    const goodConditions = ['Ready', 'HostUpgrades', 'SchedulingDisabled'];

    return this.getActiveConditions().filter((condition) => {
      return !goodConditions.includes(condition.type);
    });
  }

  getKubeletVersion() {
    return this.status?.nodeInfo?.kubeletVersion ?? '<unknown>';
  }

  getOperatingSystem(): string {
    return (
      this.metadata?.labels?.['kubernetes.io/os'] ||
      this.metadata?.labels?.['beta.kubernetes.io/os'] ||
      this.status?.nodeInfo?.operatingSystem ||
      'linux'
    );
  }

  isUnschedulable() {
    return this.spec.unschedulable;
  }
}
