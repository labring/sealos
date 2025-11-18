import { K8sApiDefault } from '@/services/backend/kubernetes/admin';
import { jsonRes } from '@/services/backend/response';
import { LicenseCR } from '@/types/license';
import * as k8s from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const defaultKc = K8sApiDefault();

    const response = (await defaultKc
      .makeApiClient(k8s.CustomObjectsApi)
      .listNamespacedCustomObject('license.sealos.io', 'v1', 'ns-admin', 'licenses')) as {
      body: {
        items: LicenseCR[];
      };
    };

    console.log(response, 'response');

    // Filter for active licenses
    const activeLicenses =
      response.body.items.filter((item) => item.status?.phase === 'Active') || [];

    jsonRes(res, {
      data: {
        hasLicense: activeLicenses.length > 0
      }
    });
  } catch (err: any) {
    console.log('check license error', err);
    jsonRes(res, {
      data: {
        hasLicense: false
      }
    });
  }
}
