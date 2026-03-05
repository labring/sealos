export type AuthenticationTokenPayload = {
  userUid: string;
  userId: string;
  regionUid?: string;
};

export type OAuth2TokenPayload = {
  sub: string;
  client_id: string;
  preferred_username?: string;
  scope?: string;
};

export type OAuth2AccessTokenPayload = OAuth2TokenPayload & {
  token_type: 'access_token';
};

export type OAuth2RefreshTokenPayload = OAuth2TokenPayload & {
  token_type: 'refresh_token';
};

export type AccessTokenPayload = {
  regionUid: string;
  userCrUid: string;
  userCrName: string;
  workspaceUid: string;
  workspaceId: string;
} & AuthenticationTokenPayload;

export type CronJobTokenPayload = {
  mergeUserUid: string;
  userUid: string;
};
export type BillingTokenPayload = AuthenticationTokenPayload;

export type OnceTokenPayload = {
  userUid: string;
  type: 'deleteUser';
};
