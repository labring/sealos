import type { NextApiRequest, NextApiResponse } from 'next';
import { Config } from '@/config';
import {
  createWorkspaceViaDesktop,
  DesktopRequestError,
  getDesktopPublicOrigin
} from '@/service/backend/desktop';
import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import {
  SubscriptionPayRequestSchema,
  PaymentResponse,
  SubscriptionPayRequest
} from '@/types/plan';
import { authSession } from '@/service/backend/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }

  try {
    const session = await authSession(req.headers);
    if (!session) {
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    }
    const parseResult = SubscriptionPayRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return jsonRes(res, {
        code: 400,
        message: 'Invalid request parameters'
      });
    }

    const {
      workspace,
      regionDomain,
      planName,
      period,
      payMethod,
      operator,
      cardId,
      promotionCode,
      createWorkspace
    } = parseResult.data;

    let finalWorkspace = workspace;

    // Step 1: Create workspace if needed
    if (createWorkspace) {
      try {
        const internalToken = req.body.internalToken;
        if (!internalToken) {
          return jsonRes(res, {
            code: 401,
            message: 'Unauthorized'
          });
        }
        finalWorkspace = await createWorkspaceViaDesktop({
          origin: getDesktopPublicOrigin(Config().cloud),
          internalToken,
          teamName: createWorkspace.teamName,
          userType: createWorkspace.userType
        });
      } catch (error) {
        console.error('Create workspace error:', error);
        if (error instanceof DesktopRequestError) {
          return jsonRes(res, {
            code: error.code,
            message: error.message
          });
        }
        return jsonRes(res, {
          code: 502,
          message: 'Failed to create workspace'
        });
      }
    }

    // Step 2: Create subscription (skip for PAYG)
    if (createWorkspace && createWorkspace.userType === 'payg') {
      // For PAYG workspaces, only workspace creation is needed, no subscription
      return jsonRes<PaymentResponse>(res, {
        data: {
          success: true
        }
      });
    }

    const client = await makeAPIClientByHeader(req, res);
    if (!client) return;

    const headers: Record<string, string> = {};
    const deviceTokenId = req.headers['device-token-id'];
    if (deviceTokenId && typeof deviceTokenId === 'string') {
      headers['Device-Token-ID'] = deviceTokenId;
    }

    const requestBody: SubscriptionPayRequest = {
      workspace: finalWorkspace,
      regionDomain,
      planName,
      period,
      payMethod,
      operator
    };

    if (cardId) {
      requestBody.cardId = cardId;
    }

    if (promotionCode) {
      requestBody.promotionCode = promotionCode;
    }

    const response = (await client.post<PaymentResponse>(
      '/account/v1alpha1/workspace-subscription/pay',
      requestBody,
      { headers }
    )) as { data: PaymentResponse };

    return jsonRes<PaymentResponse>(res, {
      data: response.data
    });
  } catch (error: any) {
    console.log('pay error', error?.response?.data);
    if (error?.response?.data?.code === 10004) {
      return jsonRes(res, {
        message: error?.response?.data?.code
      });
    }

    if (error?.response?.data) {
      return jsonRes(res, {
        code: 500,
        message: error?.response?.data?.error
      });
    }

    return jsonRes(res, {
      code: 500,
      message: 'Internal server error'
    });
  }
}
