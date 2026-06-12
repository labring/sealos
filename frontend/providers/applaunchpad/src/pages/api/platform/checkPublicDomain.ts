import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { createK8sContext } from '@/services/backend';
import {
  dryRunPublicDomainIngress,
  ensurePublicDomainTargetsAvailable,
  getPublicDomainConflictMessage,
  getPublicDomainConflictResponse,
  isIngressPublicDomainConflictError,
  PublicDomainError
} from '@/services/backend/publicDomain';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return jsonRes(res, {
      code: 405,
      error: `Method ${req.method} Not Allowed`
    });
  }

  try {
    const { prefix, domain, appName } = req.body as {
      prefix?: string;
      domain?: string;
      appName?: string;
    };

    if (!prefix || !domain) {
      return jsonRes(res, {
        code: 400,
        error: 'prefix and domain are required'
      });
    }

    const k8s = await createK8sContext(req);
    const target = {
      prefix,
      domain,
      appName
    };

    await ensurePublicDomainTargetsAvailable([target], k8s);
    const result = await dryRunPublicDomainIngress(target, k8s);

    return jsonRes(res, {
      data: {
        available: true,
        ...result
      }
    });
  } catch (err: any) {
    if (err === 'unAuthorization') {
      return jsonRes(res, {
        code: 401,
        error: 'Unauthorized'
      });
    }

    if (err instanceof PublicDomainError) {
      return jsonRes(res, {
        code: err.status,
        message:
          err.code === 'PUBLIC_DOMAIN_CONFLICT' ? getPublicDomainConflictMessage() : err.message,
        data: {
          available: false
        },
        error: {
          code: err.code,
          message: err.message
        }
      });
    }

    if (isIngressPublicDomainConflictError(err)) {
      const conflict = getPublicDomainConflictResponse(err);
      return jsonRes(res, {
        code: 409,
        message: conflict.message,
        data: {
          available: false
        },
        error: conflict
      });
    }

    return jsonRes(res, {
      code: 500,
      error: err?.body || err?.message || err
    });
  }
}
