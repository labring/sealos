import type { NextApiRequest, NextApiResponse } from 'next';
import { restartApp } from '@/services/backend';

import { sendError, sendValidationError, ErrorType, ErrorCode } from '@/types/v2alpha/error';
import {
  getK8sContextOrSendError,
  sendK8sOperationError,
  sendInternalError
} from '@/pages/api/v2alpha/k8sContext';
import { k8sAppNameSchema } from '@/types/v2alpha/request_schema';
import { z } from 'zod';

const AppNameParamSchema = z.object({ name: k8sAppNameSchema });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return sendError(res, {
        status: 405,
        type: ErrorType.CLIENT_ERROR,
        code: ErrorCode.METHOD_NOT_ALLOWED,
        message: `HTTP method ${req.method} is not supported. Use POST to restart an application.`
      });
    }

    const parseResult = AppNameParamSchema.safeParse(req.query);
    if (!parseResult.success) {
      return sendValidationError(
        res,
        parseResult.error,
        'Application name path parameter is invalid or missing.'
      );
    }

    const { name } = parseResult.data;
    const k8s = await getK8sContextOrSendError(req, res);
    if (!k8s) return;

    try {
      await k8s.getDeployApp(name);
    } catch {
      return sendError(res, {
        status: 404,
        type: ErrorType.RESOURCE_ERROR,
        code: ErrorCode.NOT_FOUND,
        message: `Application "${name}" not found in the current namespace. Please verify the application name.`
      });
    }

    try {
      await restartApp(name, k8s);
      return res.status(204).end();
    } catch (err) {
      console.error('Kubernetes restart application error:', err);
      return sendK8sOperationError(
        res,
        err,
        `Failed to restart application "${name}". The Kubernetes operation encountered an error.`
      );
    }
  } catch (err) {
    console.error('Unexpected error in restart handler:', err);
    return sendInternalError(
      res,
      err,
      'An unexpected error occurred while restarting the application. Please try again or contact support.'
    );
  }
}
