import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { newType, bd_vid, main_url } = req.body as {
      newType: number[];
      bd_vid: string;
      main_url: string;
    };

    const BD_TOKEN = process.env.BD_TOKEN;

    if (!BD_TOKEN || !bd_vid) {
      return jsonRes(res, {
        data: 'Parameter error',
        code: 400
      });
    }

    const url = 'https://ocpc.baidu.com/ocpcapi/api/uploadConvertData';

    const logidUrl = `${main_url}?bd_vid=${bd_vid}`;

    const data = {
      token: BD_TOKEN,
      conversionTypes: newType.map((item) => ({ logidUrl: logidUrl, newType: item }))
    };

    const result = await (
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
    ).json();

    jsonRes(res, {
      data: result
    });
  } catch (error) {
    console.log('upload data err', error);
    jsonRes(res, { code: 500, data: error });
  }
}
