import type { NextApiRequest, NextApiResponse } from 'next';
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
      createWorkspace
    } = parseResult.data;

    let finalWorkspace = workspace;

    // Step 1: Create workspace if needed

    if (createWorkspace) {
      try {
        const desktopUrl = global.AppConfig?.costCenter?.components?.desktopService?.url;
        const internalToken = req.body.internalToken;
        if (!desktopUrl) {
          return jsonRes(res, {
            code: 500,
            message: 'Desktop URL is not set'
          });
        }
        if (!internalToken) {
          return jsonRes(res, {
            code: 401,
            message: 'Unauthorized'
          });
        }
        console.log(
          'internalToken',
          internalToken,
          desktopUrl,
          `${desktopUrl}/api/auth/namespace/create`
        );
        const createWorkspaceResponse = await fetch(`${desktopUrl}/api/auth/namespace/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `${internalToken}`
          },
          body: JSON.stringify({
            teamName: createWorkspace.teamName,
            userType: createWorkspace.userType
          })
        });
        console.log('createWorkspaceResponse', createWorkspaceResponse);

        const workspaceData: {
          code: number;
          message: string;
          data: {
            namespace: {
              id: string; // namespace id ns-xxxx
              createTime: Date;
              role: string;
              uid: string;
              nstype: string;
              teamName: string; // team name without the 'ns-' prefix
            };
          };
        } = await createWorkspaceResponse.json();
        console.log('workspaceData', workspaceData);

        finalWorkspace = workspaceData.data?.namespace?.id;

        if (!finalWorkspace) {
          throw new Error('Failed to get workspace ID from creation response');
        }
      } catch (error: any) {
        console.error('Create workspace error:', error);
        return jsonRes(res, {
          code: 500,
          message: error.message || 'Failed to create workspace'
        });
      }
    }

    // Step 2: Create subscription
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
      operator: 'created'
    };

    if (cardId) {
      requestBody.cardId = cardId;
    }

    console.log('requestBody', requestBody);
    const response = await client.post<PaymentResponse>(
      '/account/v1alpha1/workspace-subscription/pay',
      requestBody,
      { headers }
    );
    console.log('response.data', response.data);

    return jsonRes<PaymentResponse>(res, {
      data: response.data
    });
  } catch (error: any) {
    console.log('error', error);

    return jsonRes(res, {
      code: 500,
      message: 'Internal server error'
    });
  }
}
