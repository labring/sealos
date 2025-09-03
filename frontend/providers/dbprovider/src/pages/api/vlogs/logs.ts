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
      page = 1,
      pageSize = 100,
      startTime,
      endTime,
      timeRange = '1h',
      namespace,
      app
    } = req.body;

    if (!podName || !dbType || !logType) {
      throw new Error('Missing required parameters: podName, dbType, logType');
    }

    // 构建vlogs请求参数 - 按照文档使用正确的参数名
    const vlogsParams: any = {
      namespace: namespace || 'default',
      app: app || '',
      limit: pageSize.toString(),
      jsonMode: 'false', // 数据库日志通常不需要json模式
      stderrMode: logType === LogTypeEnum.ErrorLog ? 'true' : 'false',
      numberMode: 'false', // 查询日志内容，不是统计
      numberLevel: '',
      pod: podName ? [podName] : [],
      container: [], // 数据库容器名由后端根据dbType确定
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
    console.log('Calling vlogs API:', VLOGS_CONFIG.QUERY_LOGS_URL);
    console.log('Request params:', vlogsParams);

    const vlogsResponse = await fetch(VLOGS_CONFIG.QUERY_LOGS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {})
      },
      body: JSON.stringify(vlogsParams)
    });

    console.log('Vlogs response status:', vlogsResponse.status);

    if (!vlogsResponse.ok) {
      const errorText = await vlogsResponse.text();
      console.error('Vlogs API error:', errorText);
      throw new Error(
        `Vlogs API error: ${vlogsResponse.status} ${vlogsResponse.statusText} - ${errorText}`
      );
    }

    const vlogsData = await vlogsResponse.json();
    console.log('Vlogs response data:', vlogsData);

    // 转换数据格式
    const logs = Array.isArray(vlogsData) ? vlogsData : [];
    const result = {
      logs: logs.map((log: any) => ({
        timestamp: log._time || '',
        content: log._msg || ''
      })),
      metadata: {
        total: logs.length,
        page,
        pageSize,
        processingTime: '',
        hasMore: logs.length >= pageSize
      }
    };

    jsonRes(res, { data: result });
  } catch (err: any) {
    console.error('Error in /api/vlogs/logs:', err);
    jsonRes(res, {
      code: 500,
      error: err.message || 'Internal server error'
    });
  }
}
