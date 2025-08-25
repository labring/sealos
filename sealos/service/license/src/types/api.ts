export interface ApiResp<T = any> {
  code: number;
  message: string;
  data?: T;
}

export const INVITE_LIMIT = 5;
export const TEAM_LIMIT = 5;
