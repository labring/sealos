import { getGlobalToken } from '@/services/backend/globalAuth';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { jsonRes } from '@/services/backend/response';
import { enableOAuth2 } from '@/services/enable';
import { OAuth2Type, OAuth2UserInfoType } from '@/types/user';
import { customAlphabet } from 'nanoid';
import { NextApiRequest, NextApiResponse } from 'next';
import { ProviderType } from 'prisma/global/generated/client';
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

//OAuth2 Support client_secret_post method to obtain token
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = global.AppConfig?.desktop.auth.idp.oauth2?.clientID!;
  const clientSecret = global.AppConfig?.desktop.auth.idp.oauth2?.clientSecret!;
  const tokenUrl = global.AppConfig?.desktop.auth.idp.oauth2?.tokenURL;
  const userInfoUrl = global.AppConfig?.desktop.auth.idp.oauth2?.userInfoURL;
  const oauth2CallbackUrl = global.AppConfig?.desktop.auth.idp.oauth2?.callbackURL;

  if (!enableOAuth2() || !oauth2CallbackUrl) {
    throw new Error('OAuth2 configuration missing');
  }

  const { code, semData, adClickData } = req.body;
  const url = `${tokenUrl}`;
  const oauth2Data = (await (
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: oauth2CallbackUrl
      })
    })
  ).json()) as OAuth2Type;
  const access_token = oauth2Data.access_token;

  if (!access_token) {
    return jsonRes(res, {
      message: 'Failed to authenticate',
      code: 500,
      data: 'access_token is null'
    });
  }

  const userUrl = `${userInfoUrl}?access_token=${access_token}`;
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
  const result = (await response.json()) as OAuth2UserInfoType;
  // console.log('result', result);

  // Support both standard OAuth2 (sub) and SSO360 (id) formats
  const id = result.sub || (result as any).id;

  // If name_path and user_name exist in attributes, combine them
  const attributes = (result as any)?.attributes;
  const name =
    attributes?.name_path && attributes?.user_name
      ? `${attributes.name_path} ${attributes.user_name}`
      : result?.nickname || result?.name || nanoid(8);

  const avatar_url = result?.picture || '';

  const data = await getGlobalToken({
    provider: ProviderType.OAUTH2,
    providerId: id + '',
    avatar_url,
    name,
    semData,
    adClickData
  });

  if (data?.isRestricted) {
    return jsonRes(res, {
      code: 401,
      message: 'Account banned'
    });
  }

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
});
