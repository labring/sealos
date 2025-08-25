export type DesktopTokenPayload = {
  regionUid: string;
  userCrUid: string;
  userCrName: string;
  workspaceUid: string;
  workspaceId: string;
  userUid: string;
  userId: string; // only
  iat: number;
  exp: number;
};

export type UserDB = Omit<DesktopTokenPayload, 'iat' | 'exp'> & {
  isAdmin: boolean;
};

export type AppTokenPayload = Omit<DesktopTokenPayload, 'iat' | 'exp'> & {
  isAdmin: boolean;
};

export type AppSession = {
  token: string;
  user: AppTokenPayload;
};
