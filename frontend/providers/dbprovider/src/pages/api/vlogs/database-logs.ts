import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { VLOGS_CONFIG } from '@/config/vlogs';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const {
      namespace,
      pvc,
      containers,
      type,
      startTime,
      endTime,
      timeRange = '1h',
      keyword = '',
      pageSize = 100
    } = req.body;

    if (!namespace || !pvc || !containers || !type) {
      console.error('Missing required parameters:', {
        namespace: namespace || 'undefined',
        pvc: pvc || 'undefined',
        containers: containers || 'undefined',
        type: type || 'undefined',
        requestBody: req.body
      });
      throw new Error(
        `Missing required parameters: namespace=${namespace || 'undefined'}, pvc=${pvc || 'undefined'}, containers=${containers || 'undefined'}, type=${type || 'undefined'}`
      );
    }

    // 验证PVC列表不为空
    if (!Array.isArray(pvc) || pvc.length === 0) {
      return jsonRes(res, {
        data: {
          logs: [],
          metadata: {
            total: 0,
            page: 1,
            pageSize,
            processingTime: '',
            hasMore: false
          }
        }
      });
    }

    // 构建vlogs请求参数 - 使用新接口规范（全部小写参数名）
    const vlogsParams: any = {
      namespace: namespace,
      pvc: pvc, // pvc uid 列表
      containers: containers, // 容器名称列表
      type: Array.isArray(type) ? type : [type], // 日志类型（字符串数组）
      limit: pageSize.toString(),
      numberMode: 'false',
      numberLevel: '',
      keyword: keyword || '',
      app: '' // Database logs don't use app field
    };

    // 时间参数处理：二选一，不能同时使用
    if (startTime && endTime) {
      // 使用具体时间范围（不提供 time 参数）
      // VictoriaMetrics expects timestamp format like "2025-01-10T00:00:00.000Z"
      vlogsParams.startTime = new Date(startTime).toISOString();
      vlogsParams.endTime = new Date(endTime).toISOString();
    } else {
      // 使用相对时间范围
      vlogsParams.time = timeRange;
    }

    console.log('Calling vlogs API:', VLOGS_CONFIG.QUERY_LOGS_URL);
    console.log('Request params:', vlogsParams);

    // 调用vlogs接口
    let vlogsResponse;
    try {
      vlogsResponse = await fetch(VLOGS_CONFIG.QUERY_LOGS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {})
        },
        body: JSON.stringify(vlogsParams)
      });
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      // 临时解决方案：如果 vlogs 服务不可用，返回空结果
      console.warn('Vlogs service unavailable, returning empty result');
      return jsonRes(res, {
        data: {
          logs: [],
          metadata: {
            total: 0,
            page: 1,
            pageSize,
            processingTime: '',
            hasMore: false
          }
        }
      });
    }

    console.log('Vlogs response status:', vlogsResponse.status);

    if (!vlogsResponse.ok) {
      const errorText = await vlogsResponse.text();
      console.error('Vlogs API error:', errorText);
      throw new Error(
        `Vlogs API error: ${vlogsResponse.status} ${vlogsResponse.statusText} - ${errorText}`
      );
    }

    // 安全地解析 JSON 响应
    let vlogsData;
    try {
      const responseText = await vlogsResponse.text();
      console.log('Vlogs response text:', responseText);

      if (!responseText || responseText.trim() === '') {
        console.warn('Empty response from vlogs API');
        vlogsData = [];
      } else {
        // vlogs API 返回的是 NDJSON 格式（每行一个 JSON 对象）
        // 按行分割并解析每一行
        const lines = responseText
          .trim()
          .split('\n')
          .filter((line) => line.trim());
        vlogsData = lines
          .map((line) => {
            try {
              return JSON.parse(line);
            } catch (parseError) {
              console.error('Failed to parse single line:', line.substring(0, 100));
              return null;
            }
          })
          .filter((item) => item !== null);
      }
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      // 临时解决方案：如果 JSON 解析失败，返回空结果
      console.warn('Failed to parse vlogs response, returning empty result');
      return jsonRes(res, {
        data: {
          logs: [],
          metadata: {
            total: 0,
            page: 1,
            pageSize,
            processingTime: '',
            hasMore: false
          }
        }
      });
    }

    console.log('Vlogs response data:', vlogsData);

    // 转换数据格式（将volume_uid作为Pod标识符返回）
    const logs = Array.isArray(vlogsData) ? vlogsData : [];
    const typeArray = Array.isArray(type) ? type : [type]; // 确保 type 是数组

    const result = {
      logs: logs.map((log: any, index: number) => {
        // vlogs API 返回的日志数据中，volume_uid 字段包含 pvc-{uid}
        // 优先使用 volume_uid 字段，fallback 到传入的 pvc 参数
        const volumeUid = log.volume_uid || pvc[0] || '';

        return {
          timestamp: log._time || '',
          content: log._msg || '',
          container: containers[0] || '', // 使用第一个容器名称
          pod: volumeUid, // 返回 volume_uid，前端会通过 pvcMap 映射为 pod name
          type: typeArray
        };
      }),
      metadata: {
        total: logs.length,
        page: 1,
        pageSize,
        processingTime: '',
        hasMore: logs.length >= pageSize
      }
    };

    jsonRes(res, { data: result });
  } catch (err: any) {
    console.error('Error in /api/vlogs/database-logs:', err);
    jsonRes(res, {
      code: 500,
      error: err.message || 'Internal server error'
    });
  }
}
