import { KubeConfig } from "@kubernetes/client-node";

export type CRDMeta = {
  group: string; // group
  version: string; // version
  namespace: string; // namespace
  plural: string; // type
};

export const userCRD = {
  Group: "user.sealos.io",
  Version: "v1",
  Resource: "users",
}
export type UserCR = {
  apiVersion: "user.sealos.io/v1",
  kind: "User",
  metadata: {
    annotations: object,
    creationTimestamp: string,
    finalizers: string[],
    generation: number,
    labels: {
      uid: string,
      updateTime: string,
    },
    managedFields: object[
    ],
    name: string,
    resourceVersion: string,
    uid: string,
  },
  spec: {
    csrExpirationSeconds: 7200,
  },
  status: {
    conditions: {
      lastHeartbeatTime: string,
      lastTransitionTime: string,
      message: string,
      reason: string,
      status: string,
      type: string,
    }[],
    kubeConfig: KubeConfig,
    observedCSRExpirationSeconds: number,
    observedGeneration: number,
    phase: string,
  },
}
export type StatusCR = {
  kind: "Status",
  apiVersion: "v1",
  metadata: object,
  status: string,
  message: string,
  reason: string,
  details: {
    name: string,
    group: "user.sealos.io",
    kind: "users",
  },
  code: 404,
}