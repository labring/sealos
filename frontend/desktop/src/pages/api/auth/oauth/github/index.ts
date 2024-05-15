import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { TgithubToken, TgithubUser } from '@/types/user';
import { enableGithub } from '@/services/enable';
import { getGlobalToken } from '@/services/backend/globalAuth';
import { persistImage } from '@/services/backend/persistImage';
import { isNumber } from 'lodash';
import { ProviderType } from 'prisma/global/generated/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = global.AppConfig?.desktop.auth.idp.github?.clientID!;
  const clientSecret = global.AppConfig?.desktop.auth.idp.github?.clientSecret!;
  try {
    if (!enableGithub()) {
      throw new Error('github clinet is not defined');
    }
    const { code, inviterId } = req.body;
    const url = ` https://github.com/login/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}`;
    const __data = (await (
      await fetch(url, { method: 'POST', headers: { Accept: 'application/json' } })
    ).json()) as TgithubToken;
    const access_token = __data.access_token;
    if (!access_token) {
      return jsonRes(res, {
        message: 'Failed to authenticate with GitHub',
        code: 500,
        data: 'access_token is null'
      });
    }
    const userUrl = `https://api.github.com/user`;
    const response = await fetch(userUrl, {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });
    if (!response.ok)
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    const result = (await response.json()) as TgithubUser;

    const name = result.login;
    const id = result.id;
    if (!isNumber(id)) throw Error();
    const persistUrl = await persistImage(
      result.avatar_url,
      'avatar/' + ProviderType.GITHUB + '/' + result.id
    );
    const avatar_url = persistUrl || '';
    const data = await getGlobalToken({
      provider: ProviderType.GITHUB,
      id: id + '',
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
      message: 'Failed to authenticate with GitHub',
      code: 500
    });
  }
}
