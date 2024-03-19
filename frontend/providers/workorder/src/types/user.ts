export type DesktopTokenPayload = {
  regionUid: string;
  userCrUid: string;
  userCrName: string;
  workspaceUid: string;
  workspaceId: string;
  userUid: string;
  userId: string;
};

export type UserDB = DesktopTokenPayload & {
  isAdmin: boolean;
};

export type AppTokenPayload = {
  userId: string;
  isAdmin: boolean;
};

export type AppSession = {
  token: string;
  user: AppTokenPayload;
};
