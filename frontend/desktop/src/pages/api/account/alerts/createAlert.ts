import { verifyAccessToken, generateBillingToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { CreateAlertRequest, CreateAlertResponse, ProviderType } from '@/types/alert';
import { verifyCodeGuard } from '@/services/backend/middleware/sms';
import { globalPrisma } from '@/services/backend/db/init';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Creates a new alert notification account.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      return jsonRes(res, { code: 405, message: 'Method not allowed' });
    }

    const session = await verifyAccessToken(req.headers);
    if (!session) {
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    }

    const body: CreateAlertRequest = req.body;
    const { providerType, providerId, code } = body;

    if (!providerType || !providerId) {
      return jsonRes(res, {
        code: 400,
        message: 'Missing required fields: providerType, providerId'
      });
    }

    // Check if phone/email is already bound to user account
    const userInfo = await globalPrisma.user.findUnique({
      where: { uid: session.userUid },
      include: {
        oauthProvider: {
          select: {
            providerType: true,
            providerId: true
          }
        }
      }
    });

    const isAccountBound =
      userInfo?.oauthProvider?.some(
        (p) => p.providerType.toString() === providerType && p.providerId === providerId
      ) || false;

    // Do not create alert for phone/email already bound to account
    if (isAccountBound) {
      return jsonRes(res, {
        code: 400,
        message: 'Cannot create alert for phone/email already bound to account'
      });
    }

    if (!code) {
      return jsonRes(res, {
        code: 400,
        message: 'Missing required field: code'
      });
    }

    const smsType = providerType === 'PHONE' ? 'alert_bind_phone' : 'alert_bind_email';

    await verifyCodeGuard(
      providerId,
      code,
      smsType
    )(res, async () => {
      const billingUrl = global.AppConfig.desktop.auth.billingUrl;
      if (!billingUrl) {
        return jsonRes(res, { code: 500, message: 'Billing service not configured' });
      }

      const billingToken = generateBillingToken({
        userUid: session.userUid,
        userId: session.userId
      });

      const requestBody = {
        userUid: session.userUid,
        providerType,
        providerId
      };

      const response = await fetch(
        `${billingUrl}/account/v1alpha1/user-alert-notification-account/create`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${billingToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Already bound - billing service returns 409 for duplicate accounts
        if (response.status === 409) {
          return jsonRes(res, {
            code: 410,
            message: errorData.error || 'Alert notification account already exists'
          });
        }

        throw new Error(
          errorData.error || `Failed to create alert notification account: ${response.statusText}`
        );
      }

      const result = await response.json();

      jsonRes<CreateAlertResponse>(res, {
        data: result.data,
        message: result.message || 'Successfully created user alert notification account'
      });
    });
  } catch (error) {
    jsonRes(res, {
      code: 500,
      message:
        error instanceof Error ? error.message : 'Failed to create alert notification account'
    });
  }
}
