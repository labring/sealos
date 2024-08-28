import { authSession } from '@/service/backend/auth';
import { CRDMeta, GetCRD, GetUserDefaultNameSpace } from '@/service/backend/kubernetes';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApplyYaml } from '@/service/backend/kubernetes';
import { formatISO } from 'date-fns';
import * as yaml from 'js-yaml';
import { getRegionByUid, makeAPIURL } from '@/service/backend/region';
import { AppListItem } from '@/types/app';
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(resp, { code: 403, message: 'user null' });
    }
    const {
      endTime = formatISO(new Date(), {
        representation: 'complete'
      }),
      startTime = formatISO(new Date(), {
        representation: 'complete'
      }),
      regionUid,
      appType,
      appName,
      namespace
    } = req.body as {
      endTime?: Date;
      startTime?: Date;
      regionUid: string;
      appType: string;
      appName: string;
      namespace: string;
    };
    if (!endTime)
      return jsonRes(resp, {
        code: 400,
        message: 'endTime is invalid'
      });
    if (!startTime)
      return jsonRes(resp, {
        code: 400,
        message: 'endTime is invalid'
      });
    const region = await getRegionByUid(regionUid);
    const url = makeAPIURL(region, '/account/v1alpha1/cost-app-list');
    const bodyRaw = {
      endTime,
      kubeConfig: kc.exportConfig(),
      startTime,
      appType,
      appName,
      namespace
    };
    const body = JSON.stringify(bodyRaw);

    const response = await fetch(url, {
      method: 'POST',
      body
    });
    const res = await response.json();
    if (!response.ok) {
      console.log(res);
      throw Error('get applist error');
    }

    const data = res.data as {
      apps: AppListItem[];
      total: number;
      totalPage: number;
    };
    return jsonRes(resp, {
      code: 200,
      data,
      message: res
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get applist error' });
  }
}
