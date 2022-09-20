import type { NextApiRequest, NextApiResponse } from 'next';
import { UserInfo } from '../../../../interfaces/session';
import { KubernetesDashboardApplication } from '../../../../mock/hub/kubernetes_dashboard';
import { TerminalApplication } from '../../../../mock/hub/terminal';
import { K8sApi, ReplaceInCLuster } from '../../../../services/backend/kubernetes';
import {
  BadRequestResp,
  JsonResp,
  MethodNotAllowedResp,
  NotFoundResp,
  UnprocessableResp
} from '../../response';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  if (req.method !== 'POST') {
    return BadRequestResp(resp);
  }

  // example: pass `apply/{action}/{name}` to {action} one {name} application
  const { params } = req.query;
  if (!params || typeof params == 'string' || params.length !== 2) {
    return BadRequestResp(resp);
  }
  const [action, name] = params;
  if (action === '' || name === '') {
    return BadRequestResp(resp);
  }

  const { kubeconfig } = req.body;
  // console.log(req.body);
  if (kubeconfig === '') {
    return UnprocessableResp('kubeconfig or user', resp);
  }

  const kubeconfigR = ReplaceInCLuster(kubeconfig);
  const kc = K8sApi(kubeconfigR);

  // apply action

  // currently we just support 'start' action
  if (action !== 'start') {
    return MethodNotAllowedResp(action, resp);
  }

  const cleanName = name.replace(/ /g, '-').toLowerCase();
  switch (cleanName) {
    case 'kubernetes-dashboard':
      // instant return iframe page
      const kda = await KubernetesDashboardApplication.doStart(kc);
      return JsonResp(kda, resp);
    case 'terminal':
      // call apply to start terminal pod
      const ta = await TerminalApplication.doStart(kc);
      return JsonResp(ta, resp);
  }

  return NotFoundResp(resp);
}
