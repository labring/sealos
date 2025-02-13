import { AuthConfigType } from '@/types/system';
interface InviterResponse {
  code: number;
  message: string;
  data?: {
    inviterId: string;
    reward: {
      amount: number;
    };
  };
}

export async function getInviterInfo(
  inviteeId: string
): Promise<{ inviterId?: string; amount?: bigint }> {
  const conf = global.AppConfig?.desktop.auth as AuthConfigType;
  const inviteEnabled = conf.invite?.enabled || false;
  const secretKey = conf.invite?.lafSecretKey || '';
  const baseUrl = conf.invite?.lafBaseURL || '';

  if (!inviteEnabled || !secretKey || !baseUrl) {
    return {};
  }

  try {
    const response = await fetch(`https://${baseUrl}/getInviter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inviteeId,
        secretKey
      })
    });

    const result: InviterResponse = await response.json();

    if (result.code !== 200) {
      return {};
    }

    return {
      inviterId: result.data?.inviterId,
      amount: result.data?.reward?.amount ? BigInt(result.data.reward.amount * 1000000) : BigInt(0)
    };
  } catch (error) {
    console.error('getInviteInfo error:', error);
    return {};
  }
}
