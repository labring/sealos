import { Authority, BucketCR } from '@/consts';
import { ApiResp, jsonRes } from '@/services/backend/response';
import { generateBucketCR } from '@/utils/json2Yaml';
import { V1Status, V1StatusCause } from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';
import { initK8s } from 'sealos-desktop-sdk/service';
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const client = await initK8s({ req });
    const { bucketName, bucketPolicy }: { bucketName: string; bucketPolicy: Authority } = req.body;
    if (!bucketName)
      return jsonRes(res, {
        code: 400,
        message: '"bucketName" is invaild'
      });
    if (!bucketPolicy)
      return jsonRes(res, {
        code: 400,
        message: '"bucketPolicy" is invaild'
      });
    const group = 'objectstorage.sealos.io';
    const version = 'v1';
    const plural = 'objectstoragebuckets';
    const name = bucketName;
    const policy = bucketPolicy;
    const getBucket = () =>
      client.k8sCustomObjects.getNamespacedCustomObject(
        group,
        version,
        client.namespace,
        plural,
        name
      );
    const createBucket = () =>
      client.k8sCustomObjects.createNamespacedCustomObject(
        group,
        version,
        client.namespace,
        plural,
        generateBucketCR({ name, policy, namespace: client.namespace })
      );
    await new Promise<any>((resolve, reject) => {
      getBucket().then(
        (data) => {
          // 修改Bucket
          client.k8sCustomObjects
            .patchNamespacedCustomObject(
              group,
              version,
              client.namespace,
              plural,
              name,
              {
                spec: {
                  policy
                } as BucketCR['input']['spec']
              },
              undefined,
              undefined,
              undefined,
              {
                headers: {
                  'Content-Type': 'application/merge-patch+json'
                }
              }
            )
            .then(resolve, (err) => {
              reject(err.body as V1Status);
            });
        },
        (err) => {
          const body = err.body as V1Status;
          //没有，要创建
          if (body.code === 404)
            createBucket()
              .then(() => {
                let retries = 3;
                const makeSureFn = () => {
                  getBucket().then(
                    (data) => {
                      resolve(data);
                    },
                    (err) => {
                      if (retries-- > 0) {
                        new Promise((_resolve) => setTimeout(_resolve, 1000)).finally(makeSureFn);
                      } else {
                        reject(err.body);
                      }
                    }
                  );
                };
                makeSureFn();
              })
              .catch((err) => {
                const _body = err.body as V1Status;
                reject(_body);
              });
          else reject(body);
        }
      );
    }).then(
      () => jsonRes(res, { code: 200, message: 'successfully' }),
      (body) => jsonRes(res, { code: body.code, message: body.message })
    );
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      message: 'apply bucket error'
    });
  }
}
