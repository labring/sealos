import * as yaml from 'js-yaml';

export type TerminalStatus = {
  availableReplicas: number;
  domain?: string;
};

export type TerminalForm = {
  user_name: string;
  token: string;
  namespace: string;
  currentTime: string;
  terminal_name: string;
};

// this template is suite for golang(kubernetes and sealos)'s template engine
export const generateTerminalTemplate = (form: TerminalForm): string => {
  const temp = {
    apiVersion: 'terminal.sealos.io/v1',
    kind: 'Terminal',
    metadata: {
      name: form.terminal_name,
      namespace: form.namespace,
      annotations: {
        lastUpdateTime: form.currentTime
      }
    },
    spec: {
      user: form.user_name,
      token: form.token,
      apiServer: 'https://kubernetes.default.svc.cluster.local:443',
      ttyImage: process.env.TTYD_IMAGE,
      replicas: 1,
      keepalived: process.env.KEEPALIVED
    }
  };

  try {
    const result = yaml.dump(temp);
    return result;
  } catch (error) {
    return '';
  }
};
