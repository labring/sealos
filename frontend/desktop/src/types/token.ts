export type AuthenticationTokenPayload = {
  userUid: string;
  userId: string;
  regionUid?: string;
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
