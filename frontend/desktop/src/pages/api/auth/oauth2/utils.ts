import { ZodError } from 'zod';
import { NextApiResponse } from 'next';

/**
 * Convert zod validation issues into readable OAuth2 error descriptions.
 */
export const formatValidationErrorDescription = (error: ZodError) => {
  const issue = error.issues[0];
  if (!issue) return 'Invalid request parameters';

  const fieldPath = issue.path.length > 0 ? issue.path.join('.') : 'request';
  const message = issue.message === 'Required' ? 'is required' : issue.message;
  return `'${fieldPath}' ${message}`;
};

/**
 * Applies OAuth2 token response cache-control headers.
 *
 * RFC 6749 requires no-store/no-cache semantics for sensitive OAuth2 responses.
 */
export const applyOAuth2NoStoreHeaders = (res: NextApiResponse) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
};
