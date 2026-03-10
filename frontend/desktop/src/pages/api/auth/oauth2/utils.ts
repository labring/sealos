import { ZodError } from 'zod';
import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Normalizes a Next.js query object by keeping only string values (drops arrays).
 */
export const normalizeOAuth2Query = (
  query: NextApiRequest['query']
): Record<string, string | undefined> =>
  Object.fromEntries(
    Object.entries(query).map(([k, v]) => [k, typeof v === 'string' ? v : undefined])
  );

/**
 * Normalizes a request body that may arrive as a URL-encoded string or a plain object.
 */
export const normalizeOAuth2Body = (body: NextApiRequest['body']): Record<string, unknown> => {
  if (!body) return {};
  if (typeof body === 'string') {
    return Object.fromEntries(new URLSearchParams(body).entries());
  }
  return body;
};

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
