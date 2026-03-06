import {
  OAuth2ErrorResponseSchema,
  OAuth2TokenRequestSchema,
  OAuth2TokenSuccessResponseSchema
} from '@/schema/oauth2';
import { OAuth2HttpError } from '@/services/backend/oauth2/errors';
import {
  exchangeDeviceCodeForToken,
  exchangeRefreshTokenForToken
} from '@/services/backend/oauth2/service';
import { NextApiRequest, NextApiResponse } from 'next';
import { ZodError } from 'zod';
import {
  applyOAuth2NoStoreHeaders,
  formatValidationErrorDescription,
  normalizeOAuth2Body
} from './utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  applyOAuth2NoStoreHeaders(res);
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const parsedBodyResult = OAuth2TokenRequestSchema.safeParse(normalizeOAuth2Body(req.body));
    if (!parsedBodyResult.success) {
      return res.status(400).json(
        OAuth2ErrorResponseSchema.parse({
          error: 'invalid_request',
          error_description: formatValidationErrorDescription(parsedBodyResult.error)
        })
      );
    }

    const parsedBody = parsedBodyResult.data;
    const payload =
      parsedBody.grant_type === 'refresh_token'
        ? await exchangeRefreshTokenForToken(parsedBody)
        : await exchangeDeviceCodeForToken(parsedBody);
    const data = OAuth2TokenSuccessResponseSchema.parse(payload);
    return res.status(200).json(data);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(500).json(
        OAuth2ErrorResponseSchema.parse({
          error: 'server_error',
          error_description: 'Invalid response schema'
        })
      );
    }
    if (error instanceof OAuth2HttpError) {
      return res.status(error.status).json(
        OAuth2ErrorResponseSchema.parse({
          error: error.error,
          error_description: error.message
        })
      );
    }
    return res.status(500).json(
      OAuth2ErrorResponseSchema.parse({
        error: 'server_error'
      })
    );
  }
}
