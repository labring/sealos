import type { NextApiRequest, NextApiResponse } from 'next';
import { ApplyYaml, CRDMeta, GetCRD, K8sApi, ReplaceInCLuster } from '../../../lib/kubernetes';
import { BadRequestResp, JsonResp, NotFoundResp, UnprocessableResp } from '../response';

const terminal_meta: CRDMeta = {
  group: 'terminal.sealos.io',
  version: 'v1',
  namespace: 'terminal-app',
  plural: 'terminals'
};
const terminal_name_prefix = 'terminal-';
const terminal_timeout = '4h';

type terminalStatus = {
  availableReplicas: number;
};

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  if (req.method !== 'POST') {
    return BadRequestResp(resp);
  }

  const { kubeconfig, user_id } = req.body;
  if (kubeconfig === '' || user_id == '') {
    return UnprocessableResp('kubeconfig or user_id', resp);
  }

  const kubeconfigR = ReplaceInCLuster(kubeconfig);
  const kc = K8sApi(kubeconfigR);

  const user = kc.getUser(user_id);
  if (user === null) {
    return NotFoundResp(resp);
  }
  if (!user.token || user.token === '') {
    return NotFoundResp(resp);
  }

  // get user terminal first
  const terminal_name = terminal_name_prefix + user_id;

  try {
    const terminalDesc = await GetCRD(kc, terminal_meta, terminal_name);
    if (terminalDesc !== null && terminalDesc.body !== null && terminalDesc.body.status !== null) {
      const terminalStatus = terminalDesc.body.status as terminalStatus;
      if (terminalStatus.availableReplicas > 0) {
        return JsonResp(
          {
            title: 'terminal-cloud-sealos-io',
            url: `https://${terminal_name}.cloud.sealos.io/`,
            icon: '/images/terminal.svg'
          },
          resp
        );
      }
    }
  } catch (err) {
    console.log(err);
  }

  const current_time = new Date().toISOString();

  const terminalYaml: string = `
apiVersion: ${terminal_meta.group}/${terminal_meta.version}
kind: Terminal
metadata:
  name: ${terminal_name}
  namespace: ${terminal_meta.namespace}
  annotations:
    lastUpdateTime: ${current_time}
spec:
  user: ${user_id}
  token: ${user.token}
  apiServer: https://kubernetes.default.svc.cluster.local:443
  ttyImage: ghcr.io/cuisongliu/go-docker-dev:1.18.4
  replicas: 1
  keepalived: ${terminal_timeout}
`;

  console.log(terminalYaml);

  const res = await ApplyYaml(kc, terminalYaml);
  JsonResp(res, resp);
}
