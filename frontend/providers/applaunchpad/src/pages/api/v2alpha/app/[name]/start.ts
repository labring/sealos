import type { NextApiRequest, NextApiResponse } from 'next';
import { startApp, createK8sContext } from '@/services/backend';
import { sendError, sendValidationError } from '@/utils/apiError';
import { ErrorType, ErrorCode } from '@/types/v2alpha/error';
import { z } from 'zod';

const AppNameParamSchema = z.object({
  name: z.string().min(1, { message: 'Application name is required' })
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return sendError(res, {
        status: 405,
        type: ErrorType.CLIENT_ERROR,
        code: ErrorCode.METHOD_NOT_ALLOWED,
        message: `HTTP method ${req.method} is not supported. Use POST to start an application.`
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
    const k8s = await createK8sContext(req);

    try {
      await k8s.getDeployApp(name);
    } catch (error: any) {
      return sendError(res, {
        status: 404,
        type: ErrorType.RESOURCE_ERROR,
        code: ErrorCode.NOT_FOUND,
        message: `Application "${name}" not found in the current namespace. Please verify the application name.`
      });
    }

    try {
      await startApp(name, k8s);
      return res.status(204).end();
    } catch (err: any) {
      console.error('Kubernetes start application error:', err);
      return sendError(res, {
        status: 500,
        type: ErrorType.OPERATION_ERROR,
        code: ErrorCode.KUBERNETES_ERROR,
        message: `Failed to start application "${name}". The Kubernetes operation encountered an error.`,
        details: err.message
      });
    }
  } catch (err: any) {
    console.error('Unexpected error in start handler:', err);
    return sendError(res, {
      status: 500,
      type: ErrorType.INTERNAL_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message:
        'An unexpected error occurred while starting the application. Please try again or contact support.',
      details: err.message
    });
  }
}
