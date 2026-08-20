import type { NextApiRequest, NextApiResponse } from 'next';

import { authSession } from '@/services/backend/auth';
import {
  deleteInstanceOnly,
  deleteOwnerReferencedInstance,
  getInstanceOrThrow404,
  isInstanceOwnerReferencesReady,
  legacyDeleteInstanceAll
} from '@/services/backend/instanceDelete';
import { getK8s } from '@/services/backend/kubernetes';
import * as deleteInstanceSchemas from '@/types/apis/v2alpha/delete-instance';
import { sendError, ErrorType, ErrorCode } from '@/types/v2alpha/error';

function getErrorDetails(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return sendError(res, {
      status: 405,
      type: ErrorType.CLIENT_ERROR,
      code: ErrorCode.METHOD_NOT_ALLOWED,
      message: 'Method not allowed. Use DELETE.'
    });
  }

  const params = deleteInstanceSchemas.pathParams.safeParse(req.query);
  if (!params.success) {
    return sendError(res, {
      status: 400,
      type: ErrorType.VALIDATION_ERROR,
      code: ErrorCode.INVALID_PARAMETER,
      message: 'Invalid request parameters.',
      details: params.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    });
  }

  const { instanceName } = params.data;

  let kubeconfig: string;
  try {
    kubeconfig = await authSession(req.headers);
  } catch {
    return sendError(res, {
      status: 401,
      type: ErrorType.AUTHENTICATION_ERROR,
      code: ErrorCode.AUTHENTICATION_REQUIRED,
      message: 'Invalid or missing kubeconfig.'
    });
  }

  let k8s: Awaited<ReturnType<typeof getK8s>>;
  try {
    k8s = await getK8s({ kubeconfig });
  } catch (err: any) {
    return sendError(res, {
      status: 401,
      type: ErrorType.AUTHENTICATION_ERROR,
      code: ErrorCode.AUTHENTICATION_REQUIRED,
      message: 'Invalid kubeconfig or insufficient permissions.',
      details: err?.message || 'Failed to authenticate with Kubernetes cluster'
    });
  }

  try {
    let instance;
    try {
      instance = await getInstanceOrThrow404(k8s.k8sCustomObjects, k8s.namespace, instanceName);
    } catch (error: any) {
      if (+error?.body?.code === 404) {
        return sendError(res, {
          status: 404,
          type: ErrorType.RESOURCE_ERROR,
          code: ErrorCode.NOT_FOUND,
          message: `Instance '${instanceName}' not found.`
        });
      }
      throw error?.body || error;
    }

    if (isInstanceOwnerReferencesReady(instance)) {
      await deleteOwnerReferencedInstance(k8s, instance.metadata.name);
    } else {
      await legacyDeleteInstanceAll(k8s, instanceName);
      await deleteInstanceOnly(k8s.k8sCustomObjects, k8s.namespace, instance.metadata.name);
    }

    return res.status(204).end();
  } catch (err: any) {
    const details = getErrorDetails(err?.body || err);

    if (
      details.includes('forbidden') ||
      details.includes('Forbidden') ||
      err?.body?.code === 403 ||
      err?.code === 403
    ) {
      return sendError(res, {
        status: 403,
        type: ErrorType.AUTHORIZATION_ERROR,
        code: ErrorCode.PERMISSION_DENIED,
        message: 'Permission denied: insufficient privileges to delete resources.',
        details
      });
    }

    if (
      details.includes('ECONNREFUSED') ||
      details.includes('ETIMEDOUT') ||
      details.includes('unavailable') ||
      err?.body?.code === 503 ||
      err?.code === 503
    ) {
      return sendError(res, {
        status: 503,
        type: ErrorType.INTERNAL_ERROR,
        code: ErrorCode.SERVICE_UNAVAILABLE,
        message: 'Kubernetes cluster is temporarily unavailable.',
        details
      });
    }

    return sendError(res, {
      status: 500,
      type: ErrorType.OPERATION_ERROR,
      code: ErrorCode.KUBERNETES_ERROR,
      message: 'Failed to delete instance in Kubernetes.',
      details
    });
  }
}
