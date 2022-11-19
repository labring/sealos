import { AFFiNEApplication } from 'mock/hub/affine';
import { KubernetesDashboardApplication } from 'mock/hub/kubernetes_dashboard';
import { KuBoardApplication } from 'mock/hub/kuboard';
import { PostgresAdminApplication } from 'mock/hub/pgadmin';
import { RedisInsightApplication } from 'mock/hub/redisinsight';
import { TerminalApplication } from 'mock/hub/terminal';
import type { NextApiRequest, NextApiResponse } from 'next';
import { K8sApi } from 'services/backend/kubernetes';
import {
  BadRequestResp,
  InternalErrorResp,
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

  const kc = K8sApi(kubeconfig);

  // apply action

  // currently we just support 'start' action
  if (action !== 'start') {
    return MethodNotAllowedResp(action, resp);
  }

  const cleanName = name.replace(/ /g, '-').toLowerCase();
  try {
    switch (cleanName) {
      case 'kubernetes-dashboard':
        // instant return iframe page
        const kda = await KubernetesDashboardApplication.doStart(kc);
        return JsonResp(kda, resp);
      case 'terminal':
        // call apply to start terminal pod
        const ta = await TerminalApplication.doStart(kc);
        return JsonResp(ta, resp);
      case 'kuboard':
        // call apply to start terminal pod
        const kb = await KuBoardApplication.doStart(kc);
        return JsonResp(kb, resp);
      case 'redis':
        // call apply to start redis insight pod
        const ri = await RedisInsightApplication.doStart(kc);
        return JsonResp(ri, resp);
      case 'postgres':
        // call apply to start postgres admin pod
        const pga = await PostgresAdminApplication.doStart(kc);
        return JsonResp(pga, resp);
      case 'affine':
        // call apply to start postgres admin pod
        const aa = await AFFiNEApplication.doStart(kc);
        return JsonResp(aa, resp);
    }
  } catch (err) {
    return InternalErrorResp(String(err), resp);
  }

  return NotFoundResp(resp);
}
