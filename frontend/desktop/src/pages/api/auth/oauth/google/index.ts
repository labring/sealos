import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import * as jwt from 'jsonwebtoken';
import { enableGoogle } from '@/services/enable';
import { getBase64FromRemote } from '@/utils/tools';
import { getGlobalToken } from '@/services/backend/globalAuth';
import { persistImage } from '@/services/backend/persistImage';
import { ProviderType } from 'prisma/global/generated/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = global.AppConfig?.desktop.auth.idp.google?.clientID!;
  const clientSecret = global.AppConfig?.desktop.auth.idp.google?.clientSecret!;
  const callbackUrl = global.AppConfig?.desktop.auth.callbackURL || '';
  try {
    if (!enableGoogle()) {
      throw new Error('google clinet is not defined');
    }
    const { code, inviterId } = req.body;
    if (!code)
      return jsonRes(res, {
        code: 400,
        message: 'The code is required'
      });
    const url = `https://oauth2.googleapis.com/token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&redirect_uri=${callbackUrl}&grant_type=authorization_code`;
    const response = await fetch(url, { method: 'POST', headers: { Accept: 'application/json' } });
    if (!response.ok)
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    const __data = (await response.json()) as {
      access_token: string;
      scope: string;
      token_type: string;
      id_token: string;
    };
    const userInfo = jwt.decode(__data.id_token) as {
      iss: string;
      azp: string;
      aud: string;
      sub: string;
      at_hash: string;
      name: string;
      picture: string;
      given_name: string;
      family_name: string;
      locale: string;
      iat: number;
      exp: number;
    };
    const name = userInfo.name;
    const id = userInfo.sub;
    const avatar_url =
      (await persistImage(userInfo.picture, 'avatar/' + ProviderType.WECHAT + '/' + id)) || '';
    if (!id) throw new Error('fail to get google openid');
    const data = await getGlobalToken({
      provider: ProviderType.GOOGLE,
      id: name,
      avatar_url,
      name,
      inviterId
    });
    if (!data)
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    return jsonRes(res, {
      data,
      code: 200,
      message: 'Successfully'
    });
  } catch (err) {
    console.log(err);
    return jsonRes(res, {
      message: 'Failed to authenticate with Google',
      code: 500
    });
  }
}
