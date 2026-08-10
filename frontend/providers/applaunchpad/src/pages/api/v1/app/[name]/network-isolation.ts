import type { NextApiRequest, NextApiResponse } from 'next';
import { createK8sContext } from '@/services/backend';
import {
  getNetworkIsolation,
  NetworkIsolationError,
  saveNetworkIsolation
} from '@/services/backend/networkIsolation';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import type { NetworkIsolationConfig } from '@/types/networkIsolation';
import { ResponseCode } from '@/types/response';
import { isNetworkIsolationAvailable } from '@/services/backend/networkIsolationCapability';

const getAppName = (value: string | string[] | undefined) =>
  typeof value === 'string' && value ? value : undefined;

const errorResponse = (error: unknown) => {
  if (error instanceof NetworkIsolationError) {
    return {
      code: error.status,
      message: error.message,
      error: {
        code: error.code,
        details: error.details
      }
    };
  }

  return handleK8sError(error, { forbiddenCode: ResponseCode.FORBIDDEN });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const name = getAppName(req.query.name);
  if (!name) {
    return jsonRes(res, {
      code: 400,
      message: 'Application name is required.',
      error: { code: 'INVALID_ARGUMENT' }
    });
  }

  if (req.method !== 'GET' && req.method !== 'PUT') {
    res.setHeader('Allow', 'GET, PUT');
    return jsonRes(res, {
      code: 405,
      message: 'Method not allowed.',
      error: { code: 'METHOD_NOT_ALLOWED' }
    });
  }

  if (!(await isNetworkIsolationAvailable())) {
    return jsonRes(res.status(404), {
      code: 404,
      message: 'Network isolation is not available.',
      error: { code: 'NETWORK_ISOLATION_UNAVAILABLE' }
    });
  }

  try {
    const k8s = await createK8sContext(req);

    if (req.method === 'GET') {
      return jsonRes(res, { data: await getNetworkIsolation(name, k8s) });
    }

    const revisionHeader = req.headers['if-match'];
    const revision =
      typeof revisionHeader === 'string' ? revisionHeader.replace(/^"|"$/g, '') : undefined;
    const config = (req.body?.config ?? req.body) as NetworkIsolationConfig;

    return jsonRes(res, {
      data: await saveNetworkIsolation(name, config, revision, k8s)
    });
  } catch (error) {
    return jsonRes(res, errorResponse(error));
  }
}
