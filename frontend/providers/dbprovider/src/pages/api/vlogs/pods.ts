import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { VLOGS_CONFIG } from '@/config/vlogs';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { namespace, app, startTime, endTime, timeRange = '30d' } = req.body;

    if (!namespace || !app) {
      throw new Error('Missing required parameters: namespace, app');
    }

    // 构建vlogs请求参数
    const vlogsParams: any = {
      namespace: namespace,
      app: app,
      podQuery: 'true'
    };

    // 时间参数处理：二选一，不能同时使用
    if (startTime && endTime) {
      // 使用具体时间范围（不提供 time 参数）
      vlogsParams.startTime = new Date(startTime).toISOString();
      vlogsParams.endTime = new Date(endTime).toISOString();
    } else {
      // 使用相对时间范围
      vlogsParams.time = timeRange;
    }

    // 调用vlogs接口
    const vlogsResponse = await fetch(VLOGS_CONFIG.QUERY_PODS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {})
      },
      body: JSON.stringify(vlogsParams)
    });

    if (!vlogsResponse.ok) {
      throw new Error(`Vlogs API error: ${vlogsResponse.status} ${vlogsResponse.statusText}`);
    }

    const vlogsData = await vlogsResponse.json();

    // 转换数据格式
    const pods = Array.isArray(vlogsData) ? vlogsData : [];
    const result = pods.map((podName: string) => ({
      podName,
      alias: podName
    }));

    jsonRes(res, { data: result });
  } catch (err: any) {
    console.error('Error in /api/vlogs/pods:', err);
    jsonRes(res, {
      code: 500,
      error: err.message || 'Internal server error'
    });
  }
}
