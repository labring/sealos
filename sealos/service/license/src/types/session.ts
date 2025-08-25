import { UserSignInType } from './user';

export type OAuthToken = {
  readonly access_token: string;
  readonly token_type: string;
  readonly refresh_token: string;
  readonly expiry: string;
};

export type UserInfo = {
  readonly name: string;
  readonly avatar: string;
} & UserSignInType;

export type Session = {
  token: string;
  user: UserInfo;
};

export type JWTPayload = {
  uid: string;
} & UserSignInType;

export const sessionKey = 'sealos_session';
