import { UserSecretData, UserCR } from '@/consts';
import { ApiResp, jsonRes } from '@/services/backend/response';
import { generateUserCR } from '@/utils/json2Yaml';
import { V1Status } from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';
import { initK8s } from 'sealos-desktop-sdk/service';
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const client = await initK8s({ req });
    const group = 'minio.sealos.io';
    const version = 'v1';
    const plural = 'miniousers';
    const name = client.namespace.replace('ns-', '');
    const getUser = async () => {
      const userRes = await client.k8sCustomObjects.getNamespacedCustomObjectStatus(
        group,
        version,
        client.namespace,
        plural,
        name
      );
      const body = userRes.body as UserCR['output'];
      if (body && body.status)
        return {
          CONSOLE_ACCESS_KEY: body.status.accessKey,
          CONSOLE_SECRET_KEY: body.status.secretKey,
          internal: body.status.internal,
          external: body.status.external
        } as UserSecretData;
      else return null;
    };
    const createUser = () =>
      client.k8sCustomObjects.createNamespacedCustomObject(
        group,
        version,
        client.namespace,
        plural,
        generateUserCR({ name, namespace: client.namespace })
      );
    const promise = () =>
      new Promise<UserSecretData>((resolve, reject) => {
        getUser().then(
          (val) => {
            // 先尝试拿userCR, status 没加载出来
            if (!val) {
              let count = 3;
              // 轮询3次直到成功拿到 secret
              const fn = () =>
                getUser().then(
                  (val) => {
                    if (!!val) resolve(val);
                    else {
                      if (count-- >= 0) fn();
                      else reject('not found');
                    }
                  },
                  (err: any) => {
                    if (count-- >= 0) fn();
                    else reject((err.body as V1Status).message);
                  }
                );
              fn();
            } else resolve(val);
          },
          (err: any) => {
            const body = err.body as V1Status;
            if (body.code === 404)
              // 拿不到，创建个userCR
              createUser().then(() => {
                let count = 3;
                // 轮询3次直到成功拿到 secret
                const fn = () =>
                  getUser().then(
                    (val) => {
                      if (!!val) resolve(val);
                      else {
                        if (count-- >= 0) fn();
                        else reject('not found');
                      }
                    },
                    (err: any) => {
                      if (count-- >= 0) fn();
                      else reject((err.body as V1Status).message);
                    }
                  );
                fn();
              }, reject);
            else reject(err.body.message);
          }
        );
      });
    promise().then(
      (secret) => {
        return jsonRes<{ secret: UserSecretData }>(res, {
          data: {
            secret: {
              ...secret
            }
          }
        });
      },
      (message) => {
        return jsonRes(res, {
          code: 404,
          message
        });
      }
    );
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      message: 'get secret error'
    });
  }
}
