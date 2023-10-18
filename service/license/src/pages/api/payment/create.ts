import { authSession, verifyJWT } from '@/services/backend/auth';
import { generateLicenseToken } from '@/services/backend/db/license';
import { jsonRes } from '@/services/backend/response';
import { getSealosPay } from '@/services/pay';
import { PaymentParams } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';
import { sign, verify } from 'jsonwebtoken';
import { base64Decode } from '@/utils/tools';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const { amount, currency = 'CNY', payMethod = 'wechat' } = req.body as PaymentParams;

    const userInfo = await authSession(req.headers);
    if (!userInfo) {
      return jsonRes(resp, { code: 401, message: 'token verify error' });
    }
    const { sealosPayUrl, sealosPayID, sealosPayKey } = getSealosPay();

    const result = await fetch(`${sealosPayUrl}/v1alpha1/pay/session`, {
      method: 'POST',
      body: JSON.stringify({
        appID: +sealosPayID,
        sign: sealosPayKey,
        amount: '1688',
        currency: 'CNY',
        user: 'jiahui',
        payMethod: payMethod
      })
    }).then((res) => res.json());

    // const res = generateLicenseToken({ type: 'Account', data: { amount: 19999 } });
    // console.log(res);
    // verify(
    //   res,
    //   base64Decode(
    //     'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUFvbFBTSzB0UjFKeDZtb25lL2ppeApSWGN6UGlxcU5SSXRmdW1mdWNyNGMxc2dqdlJha0NwcWtDU21lMTR1akJkU0x6QlZzRjkvUWl0UnFNb2NvaEN1CkJ6R25EQ29hWnZXbWVHeE96NEZSejVTeUg1QTlDa3dnbUEzYnFnMWxKSEZTMlZyVjVHVFhFWnphZTZtRmhHOVcKenJMTnpZMlptYTMzOVE1WTNJSDZ6RXIrcTRQbTZDOXBHVGpsSnVodlRvb0dSY2w0bmpZRXc2eHB6ZHZrdi9uSApmZmxsWGZVNDNyRGdQaGkwZDRjWnNuTUJlazUxQkNiRFRuSHlNVFdGT1RoTjc1VVM0bzJxRm9JSEhsM0N0RzE4ClZIZEdRSE1IR0dYcGN3bVhhck1EQndwVWFOSk9kMkhjTTB5dlZEY2xDZzRITkIwVUFWeFNweFlRV3BwNWJzN2gKbHdJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg=='
    //   ),
    //   function (err, decoded) {
    //     console.log(decoded);
    //   }
    // );

    return jsonRes(resp, {
      data: result
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, data: error });
  }
}
