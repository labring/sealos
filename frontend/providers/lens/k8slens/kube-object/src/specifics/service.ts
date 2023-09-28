/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { NamespaceScopedMetadata } from "../api-types";
import { KubeObject } from "../kube-object";

export interface ServicePortSpec {
  name?: string;
  protocol: string;
  port: number;
  targetPort: number;
  nodePort?: number;
}

export class ServicePort {
  name?: string;

  protocol: string;

  port: number;

  targetPort: number;

  nodePort?: number;

  constructor(data: ServicePortSpec) {
    this.name = data.name;
    this.protocol = data.protocol;
    this.port = data.port;
    this.targetPort = data.targetPort;
    this.nodePort = data.nodePort;
  }

  toString() {
    const targetPort = this.nodePort ? `:${this.nodePort}` : this.port !== this.targetPort ? `:${this.targetPort}` : "";

    return `${this.port}${targetPort}/${this.protocol}`;
  }
}

export interface ServiceSpec {
  type: string;
  clusterIP: string;
  clusterIPs?: string[];
  externalTrafficPolicy?: string;
  externalName?: string;
  loadBalancerIP?: string;
  loadBalancerSourceRanges?: string[];
  sessionAffinity: string;
  selector: Partial<Record<string, string>>;
  ports: ServicePortSpec[];
  healthCheckNodePort?: number;
  externalIPs?: string[]; // https://kubernetes.io/docs/concepts/services-networking/service/#external-ips
  topologyKeys?: string[];
  ipFamilies?: string[];
  ipFamilyPolicy?: string;
  allocateLoadBalancerNodePorts?: boolean;
  loadBalancerClass?: string;
  internalTrafficPolicy?: string;
}

export interface ServiceStatus {
  loadBalancer?: {
    ingress?: {
      ip?: string;
      hostname?: string;
    }[];
  };
}

export class Service extends KubeObject<NamespaceScopedMetadata, ServiceStatus, ServiceSpec> {
  static readonly kind = "Service";

  static readonly namespaced = true;

  static readonly apiBase = "/api/v1/services";

  getClusterIp() {
    return this.spec.clusterIP;
  }

  getClusterIps() {
    return this.spec.clusterIPs || [];
  }

  getExternalIps() {
    const lb = this.getLoadBalancer();

    if (lb?.ingress) {
      return lb.ingress.map((val) => val.ip || val.hostname);
    }

    if (Array.isArray(this.spec?.externalIPs)) {
      return this.spec.externalIPs;
    }

    return [];
  }

  getType() {
    return this.spec.type || "-";
  }

  getSelector(): string[] {
    if (!this.spec.selector) {
      return [];
    }

    return Object.entries(this.spec.selector).map((val) => val.join("="));
  }

  getPorts(): ServicePort[] {
    const ports = this.spec.ports || [];

    return ports.map((p) => new ServicePort(p));
  }

  getLoadBalancer() {
    return this.status?.loadBalancer;
  }

  isActive() {
    return this.getType() !== "LoadBalancer" || this.getExternalIps().length > 0;
  }

  getStatus() {
    return this.isActive() ? "Active" : "Pending";
  }

  getIpFamilies() {
    return this.spec.ipFamilies || [];
  }

  getIpFamilyPolicy() {
    return this.spec.ipFamilyPolicy || "";
  }
}
