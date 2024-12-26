import { NextRequest } from 'next/server';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { defaultEnv } from '@/stores/env';
import { KBRuntimeType } from '@/types/k8s';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const runtimeName = searchParams.get('runtimeName') as string;
    const headerList = req.headers;
    const { ROOT_RUNTIME_NAMESPACE } = process.env;

    const { k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    const { body: runtime } = (await k8sCustomObjects.getNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      ROOT_RUNTIME_NAMESPACE || defaultEnv.rootRuntimeNamespace,
      'runtimes',
      runtimeName
    )) as { body: KBRuntimeType };

    const data = {
      workingDir: runtime.spec.config.workingDir,
      releaseCommand: runtime.spec.config.releaseCommand.join(' '),
      releaseArgs: runtime.spec.config.releaseArgs.join(' ')
    };

    return jsonRes({ data });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
