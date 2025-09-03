import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { authSession } from '@/services/backend/auth';
import { ResponseCode, ResponseMessages } from '@/types/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  try {
    const kubeconfig = await authSession(req);
    if (!kubeconfig) {
      return jsonRes(res, {
        code: ResponseCode.UNAUTHORIZED,
        message: ResponseMessages[ResponseCode.UNAUTHORIZED]
      });
    }
  } catch (error) {
    return jsonRes(res, {
      code: ResponseCode.UNAUTHORIZED,
      message: ResponseMessages[ResponseCode.UNAUTHORIZED]
    });
  }

  const { namespace } = req.query;
  const apiUrl = `${
    process.env.DATABASE_ALERT_URL || 'http://database-alert.sealos.svc:8000'
  }/v1/databases?namespace=${namespace}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
        ...(req.headers['auth_user']
          ? {
              auth_user: Array.isArray(req.headers['auth_user'])
                ? req.headers['auth_user'][0]
                : req.headers['auth_user']
            }
          : {}),
        'Time-Zone': Array.isArray(req.headers['time-zone'])
          ? req.headers['time-zone'][0]
          : req.headers['time-zone'] || 'Asia/Shanghai'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    jsonRes(res, data);
  } catch (error) {
    // 静默处理连接错误，避免在控制台打印完整堆栈
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isConnectionError =
      errorMessage.includes('ECONNRESET') ||
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('ECONNREFUSED');

    if (isConnectionError) {
      // 连接错误时只记录简单日志，不打印完整堆栈
      console.warn('Database alerts service unavailable:', errorMessage);
    } else {
      // 其他错误打印完整信息用于调试
      console.error('Database alerts proxy error:', error);
    }

    jsonRes(res, {
      code: 500,
      error: 'Failed to fetch database alerts',
      message: errorMessage
    });
  }
}
