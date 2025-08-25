import * as k8s from '@kubernetes/client-node';

export type AdminerStatus = {
  availableReplicas: number;
  domain?: string;
};

export type AdminerForm = {
  namespace: string;
  currentTime: string;
  adminerName: string;
  connections: string[];
};

export type AdminerSpec = {
  keepalived: string;
  ingressType: string;
  connections: string[];
};

export interface AdminerObject extends k8s.KubernetesObject {
  spec: AdminerSpec;
}

// this template is suite for golang(kubernetes and sealos)'s template engine
export const generateAdminerTemplate = (form: AdminerForm): AdminerObject => {
  return {
    apiVersion: 'adminer.db.sealos.io/v1',
    kind: 'Adminer',
    metadata: {
      name: form.adminerName,
      namespace: form.namespace,
      annotations: {
        lastUpdateTime: form.currentTime
      }
    },
    spec: {
      keepalived: '4h',
      ingressType: 'nginx',
      connections: form.connections
    }
  };
};
