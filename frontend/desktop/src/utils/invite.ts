// 邀请上下文接受（公开接口）：校验邀请码并由服务端写一次性 cookie。
// /invite/[code] 落地页与 signin 的 ?invite= 兜底共用这一处调用。
export type InviteAcceptData = {
  valid: boolean;
  reason?: 'not_found' | 'disabled' | 'unavailable';
  inviterNickname?: string;
};

export type InviteAcceptResponse = {
  code: number;
  data: InviteAcceptData | null;
};

export const acceptInviteCode = async (code: string): Promise<InviteAcceptResponse> => {
  const res = await fetch('/api/platform/invite/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ code })
  });
  return (await res.json()) as InviteAcceptResponse;
};
