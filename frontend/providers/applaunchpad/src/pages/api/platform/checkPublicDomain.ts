import type { NextApiRequest, NextApiResponse } from 'next';
import { getPublicDomainErrorResponse, handleK8sError, jsonRes } from '@/services/backend/response';
import { createK8sContext } from '@/services/backend';
import {
  dryRunPublicDomainIngress,
  ensurePublicDomainTargetsAvailable,
  getPublicDomainConflictMessage,
  getPublicDomainConflictResponse,
  isIngressPublicDomainConflictError,
  PublicDomainError
} from '@/services/backend/publicDomain';
import { isCustomPublicDomainPrefixEnabled } from '@/utils/feature-gates';
import { ResponseCode } from '@/types/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return jsonRes(res, {
      code: 405,
      error: `Method ${req.method} Not Allowed`
    });
  }

  if (!isCustomPublicDomainPrefixEnabled()) {
    return jsonRes(res, {
      code: 404,
      error: 'Custom public domain prefixes are disabled'
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
      const publicDomainError = getPublicDomainErrorResponse(err);
      return jsonRes(res, {
        code: err.status,
        message:
          err.code === 'PUBLIC_DOMAIN_CONFLICT' && !err.conflictOwner
            ? getPublicDomainConflictMessage()
            : err.message,
        data: {
          available: false
        },
        error: publicDomainError
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

    return jsonRes(res, handleK8sError(err, { forbiddenCode: ResponseCode.FORBIDDEN }));
  }
}
