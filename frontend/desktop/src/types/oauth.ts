export type OAuthToken = {
  accessToken: string;
  accessTokenExpiresAt?: Date;
  clientId: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: Date;
  userId: string;
  scope?: string[];
  grants: Grant[];
};

export enum Grant {
  authorization_code = 'authorization_code',

  client_credentials = 'client_credentials',

  refresh_token = 'refresh_token',

  password = 'password'
}

export type OAuthClient = {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  grants: Grant[];
};
export type OAuthAuthorizationCode = {
  authorizationCode: string;
  expiresAt: Date;
  redirectUri: string;
  scope?: string[];
  clientId: string;
  userId: string;
};
export type OAuthUser = {
  // email: { type: String, default: '' },
  // firstname: { type: String },
  // lastname: { type: String },
  // password: { type: String },
  // username: { type: String }
  // realUserId
};
