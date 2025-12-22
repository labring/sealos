import type { NextApiRequest, NextApiResponse } from 'next';
import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import { verifyInternalToken } from '@/service/auth';
import {
  InvoiceCancelRequestSchema,
  InvoiceCancelResponse,
  InvoiceCancelResponseSchema
} from '@/types/plan';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }

  try {
    const parseResult = InvoiceCancelRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return jsonRes(res, {
        code: 400,
        message: 'Invalid request parameters',
        error: parseResult.error.flatten()
      });
    }

    const { workspace, regionDomain, invoiceID } = parseResult.data;

    // Get userUID from token
    const token = req.body.internalToken;
    const payload = await verifyInternalToken(token);
    if (!payload) {
      return jsonRes(res, {
        code: 401,
        message: 'Authorization failed'
      });
    }

    const client = await makeAPIClientByHeader(req, res);
    if (!client) return;

    const response = await client.post<InvoiceCancelResponse>(
      '/account/v1alpha1/workspace-subscription/invoice-cancel',
      {
        userUID: payload.userUid,
        workspace,
        regionDomain,
        invoiceID
      }
    );

    const responseParseResult = InvoiceCancelResponseSchema.safeParse(response.data);
    if (!responseParseResult.success) {
      return jsonRes(res, {
        code: 500,
        message: 'Invalid response format from backend',
        error: responseParseResult.error.flatten()
      });
    }

    return jsonRes<InvoiceCancelResponse>(res, {
      data: responseParseResult.data
    });
  } catch (error: any) {
    console.log({ error: error.response?.data });
    const status = error.response?.status;
    const errorData = error.response?.data;

    // Handle different error status codes
    if (status === 400) {
      return jsonRes(res, {
        code: 400,
        message:
          errorData?.error ||
          'Invalid request parameters or invoice status does not allow cancellation'
      });
    }
    if (status === 401) {
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    }
    if (status === 403) {
      return jsonRes(res, {
        code: 403,
        message: errorData?.error || 'No permission to operate this invoice'
      });
    }
    if (status === 404) {
      return jsonRes(res, {
        code: 404,
        message: errorData?.error || 'Invoice not found'
      });
    }

    return jsonRes(res, {
      code: 500,
      message: errorData?.error || 'Internal server error'
    });
  }
}
