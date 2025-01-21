import { NextRequest } from 'next/server';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { KBDevboxTypeV2 } from '@/types/k8s';

export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const headerList = req.headers;
    const { ROOT_RUNTIME_NAMESPACE } = process.env;

    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    const devboxResponse = await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxes'
    );

    const devboxBody = devboxResponse.body as { items: KBDevboxTypeV2[] };
    const uidList = devboxBody.items.map((item) => item.spec.templateID);
    const templateResultList = await devboxDB.template.findMany({
      where: {
        uid: {
          in: uidList
        }
      },
      select: {
        uid: true,
        templateRepository: {
          select: {
            iconId: true
          }
        }
      }
    });
    // match template with devbox
    const resp = devboxBody.items.flatMap((item) => {
      const templateItem = templateResultList.find(
        (templateResult) => templateResult.uid === item.spec.templateID
      );
      if (!templateItem) return [];
      return [[item, templateItem] as const];
    });

    return jsonRes({ data: resp });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
