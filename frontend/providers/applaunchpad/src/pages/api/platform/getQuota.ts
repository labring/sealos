import type { NextApiRequest, NextApiResponse } from 'next';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { authSession } from '@/services/backend/auth';
import { UserQuotaItemType } from '@/types/user';
import Decimal from 'decimal.js';
import { getGpuNode } from './resourcePrice';

async function getAmount(req: NextApiRequest): Promise<{
  data?: {
    balance: number;
    deductionBalance: number;
  };
}> {
  const domain = global.AppConfig.cloud.domain;
  const base = `https://account-api.${domain}`;

  if (!base) throw Error('not base url');
  const { kube_user, kc } = await getK8s({
    kubeconfig: await authSession(req.headers)
  });

  if (kube_user === null) {
    return { data: undefined };
  }

  const body = JSON.stringify({
    kubeConfig: kc.exportConfig()
  });

  const response = await fetch(base + '/account/v1alpha1/account', {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const data = (await response.json()) as {
    account?: {
      UserUID: string;
      ActivityBonus: number;
      EncryptBalance: string;
      EncryptDeductionBalance: string;
      CreatedAt: Date;
      Balance: number;
      DeductionBalance: number;
    };
  };

  if (!kc || !data?.account) return { data: undefined };

  return {
    data: {
      balance: data.account.Balance,
      deductionBalance: data.account.DeductionBalance
    }
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // source price
    const { getUserQuota, k8sCore } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const quota = await getUserQuota();
    const gpuNodes = await getGpuNode({ k8sCore });
    const filteredQuota = gpuNodes.length > 0 ? quota : quota.filter((item) => item.type !== 'gpu');

    let balance = '0';
    try {
      const { data } = await getAmount(req);
      if (data) {
        balance = new Decimal(data.balance)
          .minus(new Decimal(data.deductionBalance))
          .dividedBy(1000000)
          .toFixed(2);
      }
    } catch (error) {
      console.log(error, 'getAmount Error');
    }

    jsonRes<{
      balance: string;
      quota: UserQuotaItemType[];
    }>(res, {
      data: {
        quota: filteredQuota,
        balance
      }
    });
  } catch (error) {
    jsonRes(res, { code: 500, message: 'get price error' });
  }
}
