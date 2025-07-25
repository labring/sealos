import { NextRequest } from 'next/server';

import { KBDevboxTypeV2 } from '@/types/k8s';
import { devboxDB } from '@/services/db/init';
import { adaptDevboxListItemV2 } from '@/utils/adapt';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const headerList = req.headers;

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
        name: true,
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
      return [[item, templateItem] as [KBDevboxTypeV2, typeof templateItem]];
    });

    const adaptedData = resp
      .map(adaptDevboxListItemV2)
      .map((item) => ({
        id: item.id,
        name: item.name,
        createTime: item.createTime
      }))
      .sort((a, b) => {
        return new Date(b.createTime).getTime() - new Date(a.createTime).getTime();
      });

    return jsonRes({ data: adaptedData });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
