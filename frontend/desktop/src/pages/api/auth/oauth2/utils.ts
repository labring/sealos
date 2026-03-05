import { ZodError } from 'zod';

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
