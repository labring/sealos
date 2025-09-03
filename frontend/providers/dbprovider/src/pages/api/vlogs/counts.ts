import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { SupportReconfigureDBType } from '@/types/db';
import { LogTypeEnum } from '@/constants/log';
import { VLOGS_CONFIG } from '@/config/vlogs';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const {
      podName,
      dbType,
      logType,
      logPath = 'default',
      startTime,
      endTime,
      timeRange = '1h',
      namespace,
      app
    } = req.body;

    if (!podName || !dbType || !logType) {
      throw new Error('Missing required parameters: podName, dbType, logType');
    }

    // 构建vlogs请求参数 - 查询统计
    const vlogsParams: any = {
      namespace: namespace || 'default',
      app: app || '',
      limit: '10',
      jsonMode: 'false',
      stderrMode: logType === LogTypeEnum.ErrorLog ? 'true' : 'false',
      numberMode: 'true', // 查询统计
      numberLevel: 'h', // 按小时统计
      pod: podName ? [podName] : [],
      container: [],
      keyword: '',
      jsonQuery: []
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
    const vlogsResponse = await fetch(VLOGS_CONFIG.QUERY_LOGS_URL, {
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
    const counts = Array.isArray(vlogsData) ? vlogsData : [];
    const result = counts.map((item: any) => ({
      logs_total: item.logs_total || '0',
      _time: item._time || ''
    }));

    jsonRes(res, { data: result });
  } catch (err: any) {
    console.error('Error in /api/vlogs/counts:', err);
    jsonRes(res, {
      code: 500,
      error: err.message || 'Internal server error'
    });
  }
}
