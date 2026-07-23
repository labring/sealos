import { UserSecretData, UserCR } from '@/consts';
import { ApiResp, jsonRes } from '@/services/backend/response';
import { generateUserCR } from '@/utils/json2Yaml';
import { V1Status } from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';
import { initK8s } from 'sealos-desktop-sdk/service';
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const client = await initK8s({ req });
    const group = 'objectstorage.sealos.io';
    const version = 'v1';
    const plural = 'objectstorageusers';
    const newVersion = new Date().getTime();
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
          external: body.status.external,
          version: body.status?.secretKeyVersion || 0,
          specVersion: body.spec?.secretKeyVersion || 0
        } as UserSecretData;
      else return null;
    };
    // update spec
    const updateUser = () => {
      const body = generateUserCR({ name, namespace: client.namespace, version: newVersion });
      // patch by jsonPath
      return client.k8sCustomObjects.patchNamespacedCustomObject(
        group,
        version,
        client.namespace,
        plural,
        name,
        body,
        undefined,
        undefined,
        undefined,
        {
          headers: {
            'Content-Type': 'application/merge-patch+json'
          }
        }
      );
    };
    const userCR = await getUser();
    if (!userCR) throw Error();
    const canUpdate = userCR?.specVersion || 0 <= userCR.version;
    if (!canUpdate) {
      return jsonRes(res, {
        code: 403,
        message: 'you can not update secret'
      });
    }
    // update
    const result = (await updateUser()).body as V1Status;
    return jsonRes(res, { code: 200, message: 'secret is updating' });
    // create
  } catch (err: any) {
    console.log(err);
    return jsonRes(res, {
      code: 500,
      message: 'get secret error'
    });
  }
}
