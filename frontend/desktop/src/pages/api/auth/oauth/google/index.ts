import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
const clientId = process.env.GOOGLE_CLIENT_ID!;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
const callbackUrl = process.env.CALLBACK_URL || '';
import { TgithubToken, TgithubUser } from '@/types/user';
import * as jwt from 'jsonwebtoken';
import { Session } from '@/types/session';
import { getOauthRes } from '@/services/backend/oauth';
import { enableGoogle } from '@/services/enable';
import { getBase64FromRemote } from '@/utils/tools';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!enableGoogle()) {
      throw new Error('google clinet is not defined');
    }
    const { code } = req.body;
    if (!code)
      return jsonRes(res, {
        code: 400,
        message: 'The code is required'
      });
    const url = `https://oauth2.googleapis.com/token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&redirect_uri=${callbackUrl}&grant_type=authorization_code`;
    const __data = (await (
      await fetch(url, { method: 'POST', headers: { Accept: 'application/json' } })
    ).json()) as {
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
    const avatar_url = (await getBase64FromRemote(userInfo.picture)) as string;
    if (!id) throw new Error('fail to get google openid');
    const data = await getOauthRes({ provider: 'google', id, name, avatar_url });
    return jsonRes<Session>(res, {
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
