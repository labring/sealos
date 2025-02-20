import { NextRequest } from 'next/server';

import { authSession, generateAccessToken } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { KBDevboxTypeV2 } from '@/types/k8s';
import { parseTemplateConfig } from '@/utils/tools';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const devboxName = searchParams.get('devboxName') as string;

    const headerList = req.headers;

    const { k8sCore, namespace, k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    const response = await k8sCore.readNamespacedSecret(devboxName, namespace);

    const base64PublicKey = response.body.data?.['SEALOS_DEVBOX_PUBLIC_KEY'] as string;
    const base64PrivateKey = response.body.data?.['SEALOS_DEVBOX_PRIVATE_KEY'] as string;

    const jwtSecret = Buffer.from(
      response.body.data?.['SEALOS_DEVBOX_JWT_SECRET'] as string,
      'base64'
    ).toString('utf-8');
    const token = generateAccessToken({ namespace, devboxName }, jwtSecret);
    const { body: devboxBody } = (await k8sCustomObjects.getNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxes',
      devboxName
    )) as { body: KBDevboxTypeV2 };
    const template = await devboxDB.template.findUnique({
      where: {
        uid: devboxBody.spec.templateID
      }
    });
    if (!template) throw new Error(`Template ${devboxBody.spec.templateID} is not found`);
    const config = parseTemplateConfig(template.config);
    return jsonRes({
      data: {
        base64PublicKey,
        base64PrivateKey,
        token,
        userName: config.user,
        workingDir: config.workingDir,
        releaseCommand: config.releaseCommand.join(' '),
        releaseArgs: config.releaseArgs.join(' ')
      }
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
