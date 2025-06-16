import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const SERVER_BASE_URL = process.env.SERVER_BASE_URL || 'http://192.168.0.134:5002';

    await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const temp = await fetch(
      `${SERVER_BASE_URL}/api/get_pod_exception`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
      }
    );

    let alertData = await temp.json();

    alertData = alertData.map((item: any) => {
        if (typeof item.alertMessage === 'object' && item.alertMessage !== null) {
          return {
            ...item,
            alertMessage: JSON.stringify(item.alertMessage) // 将对象转换为字符串
          };
        }
        return item;
      });
      
    console.log('getAppAlertInfo result:', alertData );

    jsonRes(res, {
      data: alertData
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err.message || 'Internal Server Error'
    });
  }
}