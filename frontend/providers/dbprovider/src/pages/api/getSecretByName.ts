import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import type { DBType } from '@/types/db';
import { buildConnectionInfo, fetchDBSecret } from '@/utils/database';
import { MockDBSecret } from '@/constants/db';

export type SecretResponse = {
  username: string;
  password: string;
  host: string;
  port: string;
  connection: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const {
      dbName,
      dbType,
      mock = 'false'
    } = req.query as {
      dbName: string;
      dbType: DBType;
      mock?: string;
    };

    console.log(`[getSecretByName] API called with:`, { dbName, dbType, mock });

    if (!dbName) {
      throw new Error('dbName is empty');
    }

    if (mock === 'true') {
      return jsonRes(res, {
        data: MockDBSecret
      });
    }

    const { k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const { username, password, host, port } = await fetchDBSecret(
      k8sCore,
      dbName,
      dbType,
      namespace
    );

    const connectionInfo = buildConnectionInfo(dbType, username, password, host, port, namespace);

    const data = {
      username,
      password,
      host,
      port,
      ...connectionInfo
    };
    console.log(`[getSecretByName] Final response data:`, data);
    jsonRes<SecretResponse>(res, {
      data
    });
  } catch (err: any) {
    console.error(`[getSecretByName] Error:`, err);
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
