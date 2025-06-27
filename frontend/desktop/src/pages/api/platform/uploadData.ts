import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { AdClickData } from '@/types/adClick';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data, main_url } = req.body as {
      data: AdClickData;
      main_url: string;
    };

    if (data.source === 'Baidu') {
      const BD_TOKEN = global.AppConfig?.desktop.auth?.baiduToken;
      if (!BD_TOKEN) {
        return jsonRes(res, {
          data: 'Parameter error',
          code: 400
        });
      }

      const url = 'https://ocpc.baidu.com/ocpcapi/api/uploadConvertData';
      const uploadBody = {
        token: BD_TOKEN,
        conversionTypes: data.additionalData.newType.map((item) => ({
          logidUrl: `${main_url}?bd_vid=${data.clickId}`,
          newType: item
        }))
      };

      const result = await (
        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(uploadBody)
        })
      ).json();

      console.log('upload baidu ad click data:', data, 'result:', result);

      return jsonRes(res, {
        data: result
      });
    }

    jsonRes(res, {
      data: 'Unsupported AD source.',
      code: 400
    });
  } catch (error) {
    console.log('upload ad click data error', error);
    jsonRes(res, { code: 500, data: error });
  }
}
