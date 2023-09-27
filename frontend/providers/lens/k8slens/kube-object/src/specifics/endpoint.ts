/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import autoBind from "auto-bind";
import type {
  ObjectReference,
  KubeJsonApiData,
  KubeObjectMetadata,
  KubeObjectScope,
  NamespaceScopedMetadata,
} from "../api-types";
import { KubeObject } from "../kube-object";

export function formatEndpointSubset(subset: EndpointSubset): string {
  const { addresses, ports } = subset;

  if (!addresses || !ports) {
    return "";
  }

  return addresses.map((address) => ports.map((port) => `${address.ip}:${port.port}`).join(", ")).join(", ");
}

export interface ForZone {
  name: string;
}

export interface EndpointHints {
  forZones?: ForZone[];
}

export interface EndpointConditions {
  ready?: boolean;
  serving?: boolean;
  terminating?: boolean;
}

export interface EndpointData {
  addresses: string[];
  conditions?: EndpointConditions;
  hints?: EndpointHints;
  hostname?: string;
  nodeName?: string;
  targetRef?: ObjectReference;
  zone?: string;
}

export interface EndpointPort {
  appProtocol?: string;
  name?: string;
  protocol?: string;
  port: number;
}

export interface EndpointAddress {
  hostname?: string;
  ip: string;
  nodeName?: string;
  targetRef?: ObjectReference;
}

export interface EndpointSubset {
  addresses?: EndpointAddress[];
  notReadyAddresses?: EndpointAddress[];
  ports?: EndpointPort[];
}

export interface EndpointsData extends KubeJsonApiData<KubeObjectMetadata<KubeObjectScope.Namespace>, void, void> {
  subsets?: EndpointSubset[];
}

export class Endpoints extends KubeObject<NamespaceScopedMetadata, void, void> {
  static kind = "Endpoints";

  static namespaced = true;

  static apiBase = "/api/v1/endpoints";

  subsets?: EndpointSubset[];

  constructor({ subsets, ...rest }: EndpointsData) {
    super(rest);
    autoBind(this);
    this.subsets = subsets;
  }

  getEndpointSubsets(): Required<EndpointSubset>[] {
    return (
      this.subsets?.map(({ addresses = [], notReadyAddresses = [], ports = [] }) => ({
        addresses,
        notReadyAddresses,
        ports,
      })) ?? []
    );
  }

  toString(): string {
    return this.getEndpointSubsets().map(formatEndpointSubset).join(", ") || "<none>";
  }
}
