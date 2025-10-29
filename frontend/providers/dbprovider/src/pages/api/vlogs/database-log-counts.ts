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
      keyword = ''
    } = req.body;

    if (!namespace || !pvc || !containers || !type) {
      console.error('Missing required parameters:', {
        namespace: namespace || 'undefined',
        pvc: pvc || 'undefined',
        containers: containers || 'undefined',
        type: type || 'undefined'
      });
      throw new Error(
        `Missing required parameters: namespace=${namespace || 'undefined'}, pvc=${pvc || 'undefined'}, containers=${containers || 'undefined'}, type=${type || 'undefined'}`
      );
    }

    if (!Array.isArray(pvc) || pvc.length === 0) {
      return jsonRes(res, {
        data: []
      });
    }

    const vlogsParams: Record<string, string | number | string[]> = {
      namespace: namespace,
      pvc: pvc,
      containers: containers,
      type: Array.isArray(type) ? type : [type],
      limit: '1000',
      numberMode: 'true',
      numberLevel: 'h',
      keyword: keyword || '',
      app: ''
    };

    if (startTime && endTime) {
      vlogsParams.startTime = new Date(startTime).toISOString();
      vlogsParams.endTime = new Date(endTime).toISOString();
    } else {
      vlogsParams.time = timeRange;
    }

    console.log('Calling vlogs API for counts:', VLOGS_CONFIG.QUERY_LOGS_URL);
    console.log('Request params:', vlogsParams);

    const vlogsResponse = await fetch(VLOGS_CONFIG.QUERY_LOGS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {})
      },
      body: JSON.stringify(vlogsParams)
    });

    if (!vlogsResponse.ok) {
      const errorText = await vlogsResponse.text();
      console.error('Vlogs API error:', errorText);
      throw new Error(
        `Vlogs API error: ${vlogsResponse.status} ${vlogsResponse.statusText} - ${errorText}`
      );
    }

    const responseText = await vlogsResponse.text();
    console.log('Vlogs response text:', responseText);

    if (!responseText || responseText.trim() === '') {
      console.warn('Empty response from vlogs API');
      return jsonRes(res, { data: [] });
    }

    const lines = responseText
      .trim()
      .split('\n')
      .filter((line) => line.trim());
    const vlogsData = lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (parseError) {
          console.error('Failed to parse single line:', line.substring(0, 100));
          return null;
        }
      })
      .filter((item) => item !== null);

    console.log('Vlogs counts data:', vlogsData);

    const result = vlogsData.map((item: any) => ({
      logs_total: item.logs_total || '0',
      _time: item._time || ''
    }));

    jsonRes(res, { data: result });
  } catch (err: any) {
    console.error('Error in /api/vlogs/database-log-counts:', err);
    jsonRes(res, {
      code: 500,
      error: err.message || 'Internal server error'
    });
  }
}
