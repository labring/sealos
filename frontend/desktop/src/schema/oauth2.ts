import { z } from 'zod';

export const OAuthClientTypeSchema = z.enum(['PUBLIC', 'CONFIDENTIAL']);

export const DeviceGrantStatusSchema = z.enum(['PENDING', 'APPROVED', 'DENIED', 'CONSUMED']);

export const OAuthDeviceGrantTypeSchema = z.literal('urn:ietf:params:oauth:grant-type:device_code');
export const OAuthRefreshGrantTypeSchema = z.literal('refresh_token');

export const OAuthClientSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().min(1),
  clientType: OAuthClientTypeSchema,
  userUid: z.string().uuid().nullable().optional(),
  clientSecretHash: z.string().nullable().optional(),
  allowedGrantTypes: z.array(z.string()),
  name: z.string().min(1),
  logoUrl: z.string().url().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const OAuthDeviceGrantSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().min(1),
  deviceCodeHash: z.string().min(1),
  userCodeHash: z.string().min(1),
  userUid: z.string().uuid().nullable().optional(),
  status: DeviceGrantStatusSchema,
  expiresAt: z.date(),
  lastPollAt: z.date().nullable().optional(),
  pollCount: z.number().int().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const OAuthUserConsentSchema = z.object({
  id: z.string().uuid(),
  userUid: z.string().uuid(),
  clientId: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const OAuth2DeviceRequestSchema = z.object({
  client_id: z.string().min(1),
  scope: z.string().optional()
});

export const OAuth2DeviceResponseSchema = z.object({
  device_code: z.string().min(1),
  user_code: z.string().min(1),
  verification_uri: z.string().url(),
  verification_uri_complete: z.string().url(),
  expires_in: z.number().int().positive(),
  interval: z.number().int().positive()
});

export const OAuth2TokenDeviceRequestSchema = z
  .object({
    grant_type: OAuthDeviceGrantTypeSchema,
    device_code: z.string().min(1),
    client_id: z.string().min(1),
    client_secret: z.string().optional()
  })
  .passthrough();

export const OAuth2TokenRefreshRequestSchema = z
  .object({
    grant_type: OAuthRefreshGrantTypeSchema,
    refresh_token: z.string().min(1),
    client_id: z.string().min(1),
    client_secret: z.string().optional()
  })
  .passthrough();

export const OAuth2TokenRequestSchema = z.discriminatedUnion('grant_type', [
  OAuth2TokenDeviceRequestSchema,
  OAuth2TokenRefreshRequestSchema
]);

export const OAuth2TokenSuccessResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  token_type: z.literal('Bearer'),
  expires_in: z.number().int().positive()
});

export const OAuth2ErrorCodeSchema = z.enum([
  'invalid_request',
  'invalid_client',
  'invalid_grant',
  'unauthorized_client',
  'unsupported_grant_type',
  'authorization_pending',
  'slow_down',
  'access_denied',
  'expired_token',
  'server_error'
]);

export const OAuth2ErrorResponseSchema = z.object({
  error: OAuth2ErrorCodeSchema,
  error_description: z.string().optional()
});

export const OAuth2AuthorizeContextQuerySchema = z
  .object({
    user_code: z.string().min(1).optional(),
    request_id: z.string().uuid().optional()
  })
  .refine((v) => Boolean(v.user_code || v.request_id), {
    message: 'user_code or request_id is required'
  });

export const OAuth2AuthorizeContextResponseSchema = z.object({
  request_id: z.string().uuid(),
  client_id: z.string().min(1),
  client_name: z.string().min(1),
  client_logo_url: z.string().url().nullable().optional(),
  expires_at: z.string().datetime(),
  status: DeviceGrantStatusSchema,
  has_existing_consent: z.boolean()
});

export const OAuth2AuthorizeDecisionRequestSchema = z.object({
  request_id: z.string().uuid(),
  decision: z.enum(['approve', 'deny'])
});

export type OAuthClient = z.infer<typeof OAuthClientSchema>;
export type OAuthDeviceGrant = z.infer<typeof OAuthDeviceGrantSchema>;
export type OAuthUserConsent = z.infer<typeof OAuthUserConsentSchema>;
export type OAuth2DeviceRequest = z.infer<typeof OAuth2DeviceRequestSchema>;
export type OAuth2DeviceResponse = z.infer<typeof OAuth2DeviceResponseSchema>;
export type OAuth2TokenDeviceRequest = z.infer<typeof OAuth2TokenDeviceRequestSchema>;
export type OAuth2TokenRefreshRequest = z.infer<typeof OAuth2TokenRefreshRequestSchema>;
export type OAuth2TokenRequest = z.infer<typeof OAuth2TokenRequestSchema>;
export type OAuth2TokenSuccessResponse = z.infer<typeof OAuth2TokenSuccessResponseSchema>;
export type OAuth2ErrorResponse = z.infer<typeof OAuth2ErrorResponseSchema>;
export type OAuth2AuthorizeContextQuery = z.infer<typeof OAuth2AuthorizeContextQuerySchema>;
export type OAuth2AuthorizeContextResponse = z.infer<typeof OAuth2AuthorizeContextResponseSchema>;
export type OAuth2AuthorizeDecisionRequest = z.infer<typeof OAuth2AuthorizeDecisionRequestSchema>;
