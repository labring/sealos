import { verifyAccessToken, generateBillingToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { DeleteAlertsRequest, DeleteAlertsResponse } from '@/types/alert';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Deletes alert notification accounts by IDs.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('[deleteAlerts] Request received:', {
      method: req.method,
      body: req.body,
      headers: { authorization: req.headers.authorization ? 'present' : 'missing' }
    });

    if (req.method !== 'POST') {
      return jsonRes(res, { code: 405, message: 'Method not allowed' });
    }

    const session = await verifyAccessToken(req.headers);
    if (!session) {
      console.log('[deleteAlerts] Unauthorized: session verification failed');
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    }

    console.log('[deleteAlerts] Session verified:', {
      userUid: session.userUid,
      userId: session.userId
    });

    const body: DeleteAlertsRequest = req.body;
    const { ids } = body;

    console.log('[deleteAlerts] Request body:', { ids });

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      console.log('[deleteAlerts] Validation failed: missing or empty ids array');
      return jsonRes(res, {
        code: 400,
        message: 'Missing required field: ids (array)'
      });
    }

    const billingUrl = global.AppConfig.desktop.auth.billingUrl;
    if (!billingUrl) {
      console.log('[deleteAlerts] Error: Billing service not configured');
      return jsonRes(res, { code: 500, message: 'Billing service not configured' });
    }

    const billingToken = generateBillingToken({
      userUid: session.userUid,
      userId: session.userId
    });

    const requestBody = {
      ids,
      userUid: session.userUid
    };

    console.log('[deleteAlerts] Calling billing service:', {
      url: `${billingUrl}/account/v1alpha1/user-alert-notification-account/delete`,
      body: requestBody,
      hasToken: !!billingToken
    });

    const response = await fetch(
      `${billingUrl}/account/v1alpha1/user-alert-notification-account/delete`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${billingToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );

    console.log('[deleteAlerts] Billing service response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log('[deleteAlerts] Billing service error:', errorData);
      throw new Error(
        errorData.error || `Failed to delete alert notification accounts: ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log('[deleteAlerts] Billing service success:', result);

    jsonRes<DeleteAlertsResponse>(res, {
      data: result.data,
      message: result.message || 'Successfully deleted user alert notification accounts'
    });
  } catch (error) {
    console.error('[deleteAlerts] Error:', error);
    jsonRes(res, {
      code: 500,
      message:
        error instanceof Error ? error.message : 'Failed to delete alert notification accounts'
    });
  }
}
