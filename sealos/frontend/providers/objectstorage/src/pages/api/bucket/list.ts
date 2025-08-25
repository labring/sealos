import { ApiResp, jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { initK8s } from 'sealos-desktop-sdk/service';
import type { TBucket, BucketCR } from '@/consts';
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const client = await initK8s({ req });
    const k8sRes = await client.k8sCustomObjects.listNamespacedCustomObject(
      'objectstorage.sealos.io',
      'v1',
      client.namespace,
      'objectstoragebuckets'
    );
    if (k8sRes.response.statusCode !== 200) throw k8sRes.response.errored;
    const list = (
      k8sRes as {
        body: {
          items: BucketCR['output'][];
        };
      }
    ).body.items.flatMap<TBucket>((v) => [
      {
        name: `${client.namespace.replace(/^ns-/, '')}-${v.metadata.name}`,
        crName: v.metadata.name,
        policy: v.spec.policy,
        isComplete: !!v.status
      }
    ]);
    return jsonRes(res, { data: { list } });
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      message: 'get bucket error'
    });
  }
}
