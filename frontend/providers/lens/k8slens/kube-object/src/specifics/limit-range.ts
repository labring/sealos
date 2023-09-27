import type { NamespaceScopedMetadata } from "../api-types";
import { KubeObject } from "../kube-object";

/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
export enum LimitType {
  CONTAINER = "Container",
  POD = "Pod",
  PVC = "PersistentVolumeClaim",
}

export enum Resource {
  MEMORY = "memory",
  CPU = "cpu",
  STORAGE = "storage",
  EPHEMERAL_STORAGE = "ephemeral-storage",
}

export enum LimitPart {
  MAX = "max",
  MIN = "min",
  DEFAULT = "default",
  DEFAULT_REQUEST = "defaultRequest",
  MAX_LIMIT_REQUEST_RATIO = "maxLimitRequestRatio",
}

type LimitRangeParts = Partial<Record<LimitPart, Record<string, string>>>;

export interface LimitRangeItem extends LimitRangeParts {
  type: string;
}

export interface LimitRangeSpec {
  limits: LimitRangeItem[];
}

export class LimitRange extends KubeObject<NamespaceScopedMetadata, void, LimitRangeSpec> {
  static readonly kind = "LimitRange";

  static readonly namespaced = true;

  static readonly apiBase = "/api/v1/limitranges";

  getContainerLimits() {
    return this.spec.limits.filter((limit) => limit.type === LimitType.CONTAINER);
  }

  getPodLimits() {
    return this.spec.limits.filter((limit) => limit.type === LimitType.POD);
  }

  getPVCLimits() {
    return this.spec.limits.filter((limit) => limit.type === LimitType.PVC);
  }
}
