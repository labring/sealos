import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { AdClickData } from '@/types/adClick';
import { BingAdApiClient } from '@/services/backend/bingAdApiClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data } = req.body as {
      data: AdClickData;
    };

    if (data.source === 'Baidu') {
      const BD_TOKEN = global.AppConfig?.desktop.auth?.baiduToken;
      if (!BD_TOKEN) {
        return jsonRes(res, {
          data: 'Parameter error',
          code: 400
        });
      }

      const mainUrl = 'https://ads.sealos.run';

      const url = 'https://ocpc.baidu.com/ocpcapi/api/uploadConvertData';
      const uploadBody = {
        token: BD_TOKEN,
        conversionTypes: data.additionalData.newType.map((item) => ({
          logidUrl: `${mainUrl}?bd_vid=${data.clickId}`,
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

      console.log('Uploaded baidu AD click data:', data, '\nResult:', result);

      return jsonRes(res, {
        data: result
      });
    } else if (data.source === 'Bing') {
      if (!global.AppConfig.desktop.auth.bingAd) {
        return jsonRes(res, {
          data: 'Bing Ads API is not enabled.'
        });
      }

      if (!global.bingAdApiClient) {
        global.bingAdApiClient = new BingAdApiClient(
          global.AppConfig.desktop.auth.bingAd.tenant,
          global.AppConfig.desktop.auth.bingAd.clientId,
          global.AppConfig.desktop.auth.bingAd.clientSecret,
          global.AppConfig.desktop.auth.bingAd.refreshToken,
          global.AppConfig.desktop.auth.bingAd.developerToken,
          global.AppConfig.desktop.auth.bingAd.customerId,
          global.AppConfig.desktop.auth.bingAd.customerAccountId,
          global.AppConfig.desktop.auth.bingAd.conversionName
        );
      }

      const result = await global.bingAdApiClient.applyOfflineConversion({
        name: global.AppConfig.desktop.auth.bingAd.conversionName,
        time: new Date(data.additionalData.timestamp),
        clickId: data.clickId
      });

      console.log('Uploaded Bing AD click data:', data, '\nResult:', result);

      return jsonRes(res, {
        data: result
      });
    }

    return jsonRes(res, {
      data: 'Unsupported AD click source.',
      code: 400
    });
  } catch (error) {
    console.log('upload ad click data error', error);
    jsonRes(res, { code: 500, data: error });
  }
}
