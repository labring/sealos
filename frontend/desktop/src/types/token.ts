/**
 * Real legacy **global token** payload type.
 */
export type GlobalTokenPayload = {
  userUid: string;
  userId: string;
  /**
   * For backwards compatibility
   * @deprecated Not recommended to include regionUid in access (global) tokens.
   */
  regionUid?: string;
};

export type OAuth2TokenPayload = {
  sub: string;
  user_id: string;
  client_id: string;
  preferred_username?: string;
  scope?: string;
  /**
   * For backwards compatibility
   * @deprecated Not recommended to include regionUid in access (global) tokens.
   */
  regionUid?: never;
};

export type OAuth2AccessTokenPayload = OAuth2TokenPayload & {
  token_type: 'access_token';
};

export type OAuth2RefreshTokenPayload = OAuth2TokenPayload & {
  token_type: 'refresh_token';
};

/**
 * This is **regional token** payload, not for **global token** ("access_token" from OAuth2)
 */
export type AccessTokenPayload = {
  userUid: string;
  userId: string;
  regionUid: string;
  userCrUid: string;
  userCrName: string;
  workspaceUid: string;
  workspaceId: string;
};

export type CronJobTokenPayload = {
  mergeUserUid: string;
  userUid: string;
};
export type BillingTokenPayload = GlobalTokenPayload;

export type OnceTokenPayload = {
  userUid: string;
  type: 'deleteUser';
};
