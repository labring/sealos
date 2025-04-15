import { NextRequest } from 'next/server';

import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import {
  generateAccessToken,
  getPayloadWithoutVerification,
  verifyToken
} from '@/services/backend/auth';

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
    const { devboxName, namespace, userCrUid, userCrName, workspaceUid, workspaceId, regionUid } =
      payload;

    const { k8sCore } = await getK8s({
      kubeconfig:
        process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_MOCK_USER || '' : '',
      useDefaultConfig: process.env.NODE_ENV !== 'development'
    });

    const response = await k8sCore.readNamespacedSecret(devboxName, namespace);

    const jwtSecret = Buffer.from(
      response.body.data?.['SEALOS_DEVBOX_JWT_SECRET'] as string,
      'base64'
    ).toString('utf-8');

    if (!verifyToken(token, jwtSecret)) {
      return jsonRes({
        code: 401,
        error: 'Unauthorized'
      });
    }

    const desktopSecret = process.env.DESKTOP_SECRET!;

    const desktopToken = generateAccessToken(
      {
        namespace,
        devboxName,
        userCrUid,
        userCrName,
        workspaceUid,
        workspaceId,
        regionUid
      },
      desktopSecret
    );

    const desktopResponse = await fetch(
      `https://${process.env.SEALOS_DOMAIN}/api/auth/getKubeconfig`,
      {
        headers: {
          authorization: desktopToken
        }
      }
    );

    const desktopData = await desktopResponse.json();

    return jsonRes({
      data: {
        kc: desktopData.data.kubeconfig
      }
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err?.body || err
    });
  }
}
