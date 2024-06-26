import { verifyAccessToken } from '@/services/backend/auth';
import { getUserKubeconfigNotPatch } from '@/services/backend/kubernetes/admin';
import { K8sApi } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'failed to get info' });
    const namespace = payload.workspaceId;
    const _kc = await getUserKubeconfigNotPatch(payload.userCrName);
    if (!_kc) return jsonRes(res, { code: 404, message: 'user is not found' });
    const realKc = switchKubeconfigNamespace(_kc, namespace);
    const kc = K8sApi(realKc);
    if (!kc) return jsonRes(res, { code: 404, message: 'The kubeconfig is not found' });

    const currentTime = new Date();

    const time24HoursAgo = new Date();
    time24HoursAgo.setHours(currentTime.getHours() - 24);

    const timeOneMonthAgo = new Date();
    timeOneMonthAgo.setMonth(currentTime.getMonth() - 1);

    const base = global.AppConfig.desktop.auth.billingUrl as string;
    const consumptionUrl = base + '/account/v1alpha1/costs/consumption';

    const results = await Promise.all([
      (
        await fetch(consumptionUrl, {
          method: 'POST',
          body: JSON.stringify({
            endTime: currentTime,
            kubeConfig: kc.exportConfig(),
            owner: payload.userCrName,
            appType: '',
            namespace,
            startTime: timeOneMonthAgo
          })
        })
      ).json(),
      (
        await fetch(consumptionUrl, {
          method: 'POST',
          body: JSON.stringify({
            endTime: currentTime,
            kubeConfig: kc.exportConfig(),
            owner: payload.userCrName,
            appType: '',
            namespace,
            startTime: time24HoursAgo
          })
        })
      ).json()
    ]);

    jsonRes(res, {
      data: {
        prevMonthTime: results[0].amount || 0,
        prevDayTime: results[1].amount || 0
      }
    });
  } catch (err) {
    jsonRes(res, { code: 500, data: err });
  }
}
