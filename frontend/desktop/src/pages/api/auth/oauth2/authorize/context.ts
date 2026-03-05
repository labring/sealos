import {
  OAuth2AuthorizeContextQuerySchema,
  OAuth2AuthorizeContextResponseSchema,
  OAuth2ErrorResponseSchema
} from '@/schema/oauth2';
import { OAuth2HttpError } from '@/services/backend/oauth2/errors';
import { resolveOAuth2AuthUser } from '@/services/backend/oauth2/auth';
import { getAuthorizeContext } from '@/services/backend/oauth2/service';
import { NextApiRequest, NextApiResponse } from 'next';
import { ZodError } from 'zod';
import { formatValidationErrorDescription } from '../utils';

const normalizeQuery = (query: NextApiRequest['query']) => ({
  user_code: typeof query.user_code === 'string' ? query.user_code : undefined,
  request_id: typeof query.request_id === 'string' ? query.request_id : undefined
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  try {
    const parsedQueryResult = OAuth2AuthorizeContextQuerySchema.safeParse(
      normalizeQuery(req.query)
    );
    if (!parsedQueryResult.success) {
      return res.status(400).json(
        OAuth2ErrorResponseSchema.parse({
          error: 'invalid_request',
          error_description: formatValidationErrorDescription(parsedQueryResult.error)
        })
      );
    }

    const parsedQuery = parsedQueryResult.data;
    const auth = await resolveOAuth2AuthUser(req);
    const payload = await getAuthorizeContext(parsedQuery, auth?.userUid);
    const data = OAuth2AuthorizeContextResponseSchema.parse(payload);
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
