import type { NextRequest } from 'next/server';

import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { authSession, verifyToken } from '@/services/backend/auth';
import { WorkspaceQuotaItem } from '@/types/workspace';
import { cpuFormatToM, memoryFormatToMi } from '@/utils/tools';
import { sign } from 'jsonwebtoken';

type QuotaStatus = Record<string, string>;
type UpstreamQuotaResponse = {
  quota?: {
    hard?: QuotaStatus;
    used?: QuotaStatus;
  };
};

export const dynamic = 'force-dynamic';

// [TODO] This is the only API that needs to be authenticated, so we put all the authentication logic here.
type BillingTokenPayload = {
  userUid: string;
  userId: string;
};

function generateBillingToken(jwtSecret: string, props: BillingTokenPayload) {
  return sign(props, jwtSecret, { expiresIn: '5d' });
}

export async function GET(req: NextRequest) {
  try {
    const desktopToken = req.headers.get('X-Desktop-Token');
    if (!desktopToken) {
      return jsonRes({
        code: 401,
        error: 'Unauthorized'
      });
    }

    const { namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const { ACCOUNT_URL, SEALOS_DOMAIN, GPU_ENABLE, JWT_SECRET } = process.env;
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET needs to be configured!');
    }

    const session = await verifyToken(desktopToken, JWT_SECRET).catch(() => null);
    if (!session) {
      return jsonRes({
        code: 401,
        error: 'Unauthorized'
      });
    }

    const billingToken = generateBillingToken(JWT_SECRET, {
      userId: session.userId,
      userUid: session.userUid
    });

    const baseUrl = ACCOUNT_URL ? ACCOUNT_URL : `https://account-api.${SEALOS_DOMAIN}`;
    const quotaRes = await fetch(baseUrl + '/account/v1alpha1/workspace/get-resource-quota', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${billingToken}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip,deflate,compress'
      },
      body: JSON.stringify({
        workspace: namespace
      })
    });

    console.log(`Bearer ${billingToken}`);
    const data: UpstreamQuotaResponse = await quotaRes.clone().json();

    const hard = data.quota?.hard || {};
    const used = data.quota?.used || {};

    const quota: WorkspaceQuotaItem[] = [
      {
        type: 'cpu',
        limit: cpuFormatToM(hard['limits.cpu'] || ''),
        used: cpuFormatToM(used['limits.cpu'] || '')
      },
      {
        type: 'memory',
        limit: memoryFormatToMi(hard['limits.memory'] || ''),
        used: memoryFormatToMi(used['limits.memory'] || '')
      },
      {
        type: 'storage',
        limit: memoryFormatToMi(hard['requests.storage'] || ''),
        used: memoryFormatToMi(used['requests.storage'] || '')
      },
      {
        type: 'nodeport',
        limit: Number(hard['services.nodeports']) || 0,
        used: Number(used['services.nodeports']) || 0
      },
      {
        type: 'traffic',
        limit: Number(hard['traffic']) || 0,
        used: Number(used['traffic']) || 0
      },
      {
        type: 'gpu',
        limit: Number(hard['limits.nvidia.com/gpu'] || hard['requests.nvidia.com/gpu'] || 0),
        used: Number(used['limits.nvidia.com/gpu'] || used['requests.nvidia.com/gpu'] || 0)
      }
    ];

    const filteredQuota = GPU_ENABLE ? quota : quota.filter((item) => item.type !== 'gpu');

    return jsonRes({
      data: {
        quota: filteredQuota
      }
    });
  } catch (error) {
    console.log(error);
    return jsonRes({ code: 500, message: 'get namespace quota error' });
  }
}
