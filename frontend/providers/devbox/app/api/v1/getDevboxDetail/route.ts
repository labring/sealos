import { NextRequest } from 'next/server';

import { devboxStatusMap } from '@/constants/devbox';
import { getPayloadWithoutVerification, verifyToken } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { KBDevboxTypeV2 } from '@/types/k8s';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { payload, token } = getPayloadWithoutVerification(req.headers);
    if (!payload || !token) {
      return jsonRes({
        code: 401,
        error: 'Unauthorized'
      });
    }
    const lookupDevboxName = payload.devboxName;
    const lookupNamespace = payload.namespace;

    const { k8sCore, k8sCustomObjects } = await getK8s({
      kubeconfig:
        process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_MOCK_USER || '' : '',
      useDefaultConfig: process.env.NODE_ENV !== 'development'
    });

    const response = await k8sCore.readNamespacedSecret(lookupDevboxName, lookupNamespace);

    const jwtSecret = Buffer.from(
      response.body.data?.['SEALOS_DEVBOX_JWT_SECRET'] as string,
      'base64'
    ).toString('utf-8');

    const verifiedPayload = verifyToken(token, jwtSecret);
    if (!verifiedPayload) {
      return jsonRes({
        code: 401,
        error: 'Unauthorized'
      });
    }
    const { devboxName, namespace } = verifiedPayload;

    const { body } = (await k8sCustomObjects.getNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha2',
      namespace,
      'devboxes',
      devboxName
    )) as {
      body: KBDevboxTypeV2;
    };

    const devbox = {
      status:
        body.status?.phase && devboxStatusMap[body.status.phase]
          ? devboxStatusMap[body.status.phase]
          : devboxStatusMap.Pending
    };

    return jsonRes({
      data: {
        devbox
      }
    });
  } catch (err: any) {
    if (err?.response?.statusCode === 404) {
      return jsonRes({
        code: 401,
        error: 'Unauthorized'
      });
    }
    return jsonRes({ code: 500, error: 'Internal Server Error' });
  }
}
