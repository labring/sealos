import type { NextApiRequest, NextApiResponse } from 'next';
import { BadRequestResp, NotFoundResp, UnprocessableResp, JsonResp } from '../response';
import { K8sApi, ApplyYaml, CheckIsInCluster, ReadService } from '../../../lib/kubernetes';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  if (req.method !== 'POST') {
    return BadRequestResp(resp);
  }

  const { kubeconfig, user_id } = req.body;
  if (kubeconfig === '' || user_id == '') {
    return UnprocessableResp('kubeconfig or user_id', resp);
  }

  const kubeconfigR = kubeconfig;
  if (CheckIsInCluster()) {
    const kubeconfigR = kubeconfig.replace(
      'https://apiserver.cluster.local:6443',
      'https://kubernetes.default.svc.cluster.local:443'
    );
  }

  const kc = K8sApi(kubeconfigR);

  const user = kc.getUser(user_id);
  if (user === null) {
    return NotFoundResp(resp);
  }
  if (!user.token || user.token === '') {
    return NotFoundResp(resp);
  }

  // get user terminal first
  const terminal_name = `terminal-${user_id}`;
  const terminal_namespace = 'terminal-app';

  try {
    // const terminalDesc = await ReadService(
    //   kc,
    //   'terminal-controller-manager-567d7f5558-8bph9',
    //   'terminal-system'
    // );
    const terminalDesc = await ReadService(kc, terminal_name, terminal_namespace);
    // debugger;
    if (
      terminalDesc !== null &&
      terminalDesc.body !== null &&
      terminalDesc.body.status !== null &&
      terminalDesc.body.status === 'Running'
    ) {
      return JsonResp(
        {
          title: 'terminal-cloud-sealos-io',
          url: `https://${terminal_name}.cloud.sealos.io/`,
          icon: '/images/terminal.svg'
        },
        resp
      );
    }
  } catch (err) {
    console.log(err);
  }

  const current_time = new Date().toISOString();

  const terminalYaml: string = `
apiVersion: terminal.sealos.io/v1
kind: Terminal
metadata:
  name: ${terminal_name}
  namespace: ${terminal_namespace}
  annotations:
    lastUpdateTime: "${current_time}"
spec:
  user: ${user_id}
  token: ${user.token}
  apiServer: https://kubernetes.default.svc.cluster.local:443
  ttyImage: ghcr.io/cuisongliu/go-docker-dev:1.18.4
  replicas: 1
  keepalived: 4h
`;

  console.log(terminalYaml);

  const res = await ApplyYaml(kc, terminalYaml);
  JsonResp(res, resp);
}
