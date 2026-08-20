import { OAuth2ErrorCodeSchema } from '@/schema/oauth2';
import { z } from 'zod';

export type OAuth2ErrorCode = z.infer<typeof OAuth2ErrorCodeSchema>;

export class OAuth2HttpError extends Error {
  status: number;
  error: OAuth2ErrorCode;

  constructor(status: number, error: OAuth2ErrorCode, message?: string) {
    super(message || error);
    this.status = status;
    this.error = error;
  }
}
