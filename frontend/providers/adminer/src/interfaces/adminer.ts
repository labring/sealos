import * as yaml from 'js-yaml';

export type AdminerStatus = {
  availableReplicas: number;
  domain?: string;
};

export type AdminerForm = {
  namespace: string;
  currentTime: string;
  adminerName: string;
  connections: Array<string>;
};

// this template is suite for golang(kubernetes and sealos)'s template engine
export const generateAdminerTemplate = (form: AdminerForm): string => {
  const temp = {
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
      connections: form.connections
    }
  };

  try {
    const result = yaml.dump(temp);
    return result;
  } catch (error) {
    return '';
  }
};
