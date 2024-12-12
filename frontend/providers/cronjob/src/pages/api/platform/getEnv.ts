import { defaultDomain } from '@/constants/keys';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export type EnvResponse = {
  domain: string;
  applaunchpadUrl: string;
  successfulJobsHistoryLimit: number;
  failedJobsHistoryLimit: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  jsonRes<EnvResponse>(res, {
    data: {
      domain: process.env.SEALOS_DOMAIN || defaultDomain,
      applaunchpadUrl: process.env.APPLAUNCHPAD_URL || `applaunchpad.${process.env.SEALOS_DOMAIN}`,
      successfulJobsHistoryLimit: Number(process.env.SUCCESSFUL_JOBS_HISTORY_LIMIT) || 3,
      failedJobsHistoryLimit: Number(process.env.FAILED_JOBS_HISTORY_LIMIT) || 3
    }
  });
}
