import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
const clientId = process.env.GITHUB_CLIENT_ID!;
const clientSecret = process.env.GITHUB_CLIENT_SECRET!;
import { TgithubToken, TgithubUser } from '@/types/user';

import { Session } from '@/types/session';
import { getOauthRes } from '@/services/backend/oauth';
import { enableGithub } from '@/services/enable';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!enableGithub()) {
      throw new Error('github clinet is not defined');
    }
    const { code } = req.body;
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
    const result = (await (
      await fetch(userUrl, {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      })
    ).json()) as TgithubUser;
    const name = result.login;
    const id = '' + result.id;
    const avatar_url = result.avatar_url;

    const data = await getOauthRes({ provider: 'github', id, name, avatar_url });
    return jsonRes<Session>(res, {
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
