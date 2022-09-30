import * as k8s from '@kubernetes/client-node';
import { ApplicationType, RunApplication, StartResp } from '../../interfaces/kubernetes';
import { ApplyYaml, CRDMeta, GetCRD } from '../../services/backend/kubernetes';
import { CRDTemplateBuilder } from '../../services/backend/wrapper';

const terminal_meta: CRDMeta = {
  group: 'terminal.sealos.io',
  version: 'v1',
  namespace: 'terminal-app',
  plural: 'terminals'
};

// this template is suite for golang(kubernetes and sealos)'s template engine
const terminal_crd_template: string = `
apiVersion: terminal.sealos.io/v1
kind: Terminal
metadata:
  name: terminal-{{ .kube_user.name }}
  namespace: {{ .namespace }}
  annotations:
    lastUpdateTime: {{ .current_time }}
spec:
  user: {{ .kube_user.name }}
  token: {{ .kube_user.token }}
  apiServer: https://kubernetes.default.svc.cluster.local:443
  ttyImage: ghcr.io/cuisongliu/go-docker-dev:1.18.4
  replicas: 1
  keepalived: 4h
`;

type terminalStatus = {
  availableReplicas: number;
  domain?: string;
};

const TerminalApplication: RunApplication = {
  name: 'Terminal',
  description: 'Terminal',
  icon: '/images/terminal.svg',
  application_type: ApplicationType.IFrame,
  startTemplate: '',
  doStart: async (kc: k8s.KubeConfig): Promise<StartResp> => {
    const kube_user = kc.getCurrentUser();
    if (
      kube_user === null ||
      ((!kube_user.token || kube_user.token === '') &&
        (!kube_user.keyData ||
          kube_user.keyData === '' ||
          !kube_user.certData ||
          kube_user.certData === ''))
    ) {
      return Promise.resolve({
        status: 500,
        application_type: ApplicationType.IFrame,
        iframe_page: ''
      } as StartResp);
    }

    const terminal_name = 'terminal-' + kube_user.name;

    try {
      const terminalDesc = await GetCRD(kc, terminal_meta, terminal_name);
      if (
        terminalDesc !== null &&
        terminalDesc.body !== null &&
        terminalDesc.body.status !== null
      ) {
        const terminalStatus = terminalDesc.body.status as terminalStatus;
        if (terminalStatus.availableReplicas > 0) {
          // temporarily add domain scheme
          let domain = terminalStatus.domain || '';
          if (!domain.startsWith('https://')) {
            domain = 'https://' + domain;
          }

          return Promise.resolve({
            status: 200,
            application_type: ApplicationType.IFrame,
            iframe_page: domain
          } as StartResp);
        }
      }
    } catch (err) {
      // console.log(err);

      if (err instanceof k8s.HttpError) {
        // if code == 404, we can run apply
        if (err.body.code !== 404) {
          return Promise.resolve({
            status: err.body.code,
            application_type: ApplicationType.IFrame,
            iframe_page: ''
          } as StartResp);
        }
      } else {
        return Promise.resolve({
          status: 500,
          application_type: ApplicationType.IFrame,
          iframe_page: ''
        } as StartResp);
      }
    }

    const current_time = new Date().toISOString();
    // TODO: fix with user-namespace variable
    const namespace = terminal_meta.namespace;

    const terminalCRD = CRDTemplateBuilder(terminal_crd_template, {
      current_time,
      namespace,
      kube_user
    });
    // console.log(terminalCRD);

    // here res is array of length=1
    const res = await ApplyYaml(kc, terminalCRD);

    // https://stackoverflow.com/questions/12449538/http-response-code-for-please-wait-a-little-bit
    return Promise.resolve({
      status: 202,
      application_type: ApplicationType.IFrame,
      iframe_page: '',
      extra: res[0]
    } as StartResp);
  }
};

export { TerminalApplication };
