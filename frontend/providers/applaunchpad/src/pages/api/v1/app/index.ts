import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import { GetApps } from '../../getApps';
import { adaptAppListItem } from '@/utils/adapt';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const apps = await GetApps({ req });

    const adaptApps = apps.map(adaptAppListItem);

    jsonRes(res, { data: adaptApps });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
