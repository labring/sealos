import { verifyAccessToken, generateBillingToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { ListAlertsResponse } from '@/types/alert';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Lists all alert notification accounts for the current user.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('[listAlerts] Request received:', {
      method: req.method,
      body: req.body,
      headers: { authorization: req.headers.authorization ? 'present' : 'missing' }
    });

    if (req.method !== 'POST') {
      return jsonRes(res, { code: 405, message: 'Method not allowed' });
    }

    const session = await verifyAccessToken(req.headers);
    if (!session) {
      console.log('[listAlerts] Unauthorized: session verification failed');
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    }

    console.log('[listAlerts] Session verified:', {
      userUid: session.userUid,
      userId: session.userId
    });

    const billingUrl = global.AppConfig.desktop.auth.billingUrl;
    if (!billingUrl) {
      console.log('[listAlerts] Error: Billing service not configured');
      return jsonRes(res, { code: 500, message: 'Billing service not configured' });
    }

    const billingToken = generateBillingToken({
      userUid: session.userUid,
      userId: session.userId
    });

    console.log('[listAlerts] Calling billing service:', {
      url: `${billingUrl}/account/v1alpha1/user-alert-notification-account/list`,
      hasToken: !!billingToken
    });

    const response = await fetch(
      `${billingUrl}/account/v1alpha1/user-alert-notification-account/list`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${billingToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      }
    );

    console.log('[listAlerts] Billing service response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log('[listAlerts] Billing service error:', errorData);
      throw new Error(
        errorData.error || `Failed to list alert notification accounts: ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log('[listAlerts] Billing service success:', {
      dataCount: Array.isArray(result.data) ? result.data.length : 0,
      message: result.message
    });

    jsonRes<ListAlertsResponse>(res, {
      data: result.data || [],
      message: result.message || 'Successfully listed user alert notification accounts'
    });
  } catch (error) {
    console.error('[listAlerts] Error:', error);
    jsonRes(res, {
      code: 500,
      message: error instanceof Error ? error.message : 'Failed to list alert notification accounts'
    });
  }
}
