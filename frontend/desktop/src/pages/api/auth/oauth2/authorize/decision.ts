import { OAuth2AuthorizeDecisionRequestSchema, OAuth2ErrorResponseSchema } from '@/schema/oauth2';
import { OAuth2HttpError } from '@/services/backend/oauth2/errors';
import { resolveOAuth2AuthUser } from '@/services/backend/oauth2/auth';
import { submitAuthorizeDecision } from '@/services/backend/oauth2/service';
import { NextApiRequest, NextApiResponse } from 'next';
import { z, ZodError } from 'zod';
import {
  applyOAuth2NoStoreHeaders,
  formatValidationErrorDescription,
  normalizeOAuth2Body
} from '../utils';

const DecisionResponseSchema = z.object({
  status: z.enum(['approved', 'denied'])
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  applyOAuth2NoStoreHeaders(res);
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const auth = await resolveOAuth2AuthUser(req);
    if (!auth?.userUid) {
      throw new OAuth2HttpError(401, 'invalid_request', 'Authentication required');
    }
    const parsedBodyResult = OAuth2AuthorizeDecisionRequestSchema.safeParse(
      normalizeOAuth2Body(req.body)
    );
    if (!parsedBodyResult.success) {
      return res.status(400).json(
        OAuth2ErrorResponseSchema.parse({
          error: 'invalid_request',
          error_description: formatValidationErrorDescription(parsedBodyResult.error)
        })
      );
    }
    const parsedBody = parsedBodyResult.data;
    const payload = await submitAuthorizeDecision({
      requestId: parsedBody.request_id,
      decision: parsedBody.decision,
      userUid: auth.userUid
    });
    const data = DecisionResponseSchema.parse(payload);
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
