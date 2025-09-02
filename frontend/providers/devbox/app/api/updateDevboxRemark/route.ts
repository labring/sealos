import { NextRequest } from 'next/server';
import { jsonRes } from '@/services/backend/response';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { PatchUtils } from '@kubernetes/client-node';
import { devboxRemarkKey } from '@/constants/devbox';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { devboxName, remark } = (await req.json()) as {
      devboxName: string;
      remark: string;
    };

    if (!devboxName) {
      return jsonRes({
        code: 500,
        error: 'params error'
      });
    }

    const headerList = req.headers;

    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    await k8sCustomObjects.patchNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha2',
      namespace,
      'devboxes',
      devboxName,
      {
        metadata: {
          annotations: {
            [devboxRemarkKey]: remark
          }
        }
      },
      undefined,
      undefined,
      undefined,
      {
        headers: {
          'Content-Type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH
        }
      }
    );

    return jsonRes({
      data: 'success update devbox remark'
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
