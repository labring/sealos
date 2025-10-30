import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { VLOGS_CONFIG } from '@/config/vlogs';
import type { NextApiRequest, NextApiResponse } from 'next';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

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
      pageSize = 100,
      timeZone = 'local'
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

    const vlogsParams: Record<string, string | number | string[]> = {
      namespace: namespace,
      pvc: pvc,
      containers: containers,
      type: Array.isArray(type) ? type : [type],
      limit: pageSize.toString(),
      numberMode: 'false',
      numberLevel: '',
      keyword: keyword || '',
      app: ''
    };

    if (startTime && endTime) {
      if (timeZone === 'local') {
        vlogsParams.startTime = dayjs(startTime).format('YYYY-MM-DDTHH:mm:ss');
        vlogsParams.endTime = dayjs(endTime).format('YYYY-MM-DDTHH:mm:ss');
      } else if (timeZone && timeZone !== 'utc') {
        vlogsParams.startTime = dayjs(startTime).tz(timeZone).toISOString();
        vlogsParams.endTime = dayjs(endTime).tz(timeZone).toISOString();
      } else {
        vlogsParams.startTime = dayjs(startTime).utc().toISOString();
        vlogsParams.endTime = dayjs(endTime).utc().toISOString();
      }
    } else {
      vlogsParams.time = timeRange;
    }

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

    let vlogsData;
    try {
      const responseText = await vlogsResponse.text();
      console.log('Vlogs response text:', responseText);

      if (!responseText || responseText.trim() === '') {
        console.warn('Empty response from vlogs API');
        vlogsData = [];
      } else {
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

    const logs = Array.isArray(vlogsData) ? vlogsData : [];
    const typeArray = Array.isArray(type) ? type : [type];

    const result = {
      logs: logs.map((log: any, index: number) => {
        const volumeUid = log.volume_uid || pvc[0] || '';

        return {
          timestamp: log._time || '',
          content: log._msg || '',
          container: containers[0] || '',
          pod: volumeUid,
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
