import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  CreateLaunchpadRequestSchema,
  transformToLegacySchema,
  transformFromLegacySchema
} from '@/types/v2alpha/request_schema';
import { createApp, createK8sContext, getAppByName } from '@/services/backend';
import { adaptAppDetail } from '@/utils/adapt';
import { DeployKindsType, AppDetailType } from '@/types/app';
import { z } from 'zod';
import { LaunchpadApplicationSchema } from '@/types/v2alpha/schema';
import { sendError, sendValidationError } from '@/utils/apiError';
import { ErrorType, ErrorCode } from '@/types/v2alpha/error';

async function processAppResponse(
  response: PromiseSettledResult<any>[]
): Promise<z.infer<typeof LaunchpadApplicationSchema>> {
  const responseData = response
    .map((item: any) => {
      if (item.status === 'fulfilled') return item.value.body;
      if (+item.reason?.body?.code === 404) return '';
      throw new Error('Get APP Deployment Error');
    })
    .filter((item: any) => item)
    .flat() as DeployKindsType[];

  const appDetailData: AppDetailType = await adaptAppDetail(responseData, {
    SEALOS_DOMAIN: global.AppConfig.cloud.domain,
    SEALOS_USER_DOMAINS: global.AppConfig.cloud.userDomains
  });
  const standardizedData = transformFromLegacySchema(appDetailData);
  const validatedData = LaunchpadApplicationSchema.parse(standardizedData);
  return validatedData;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;

    if (method === 'POST') {
      const parseResult = CreateLaunchpadRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        return sendValidationError(
          res,
          parseResult.error,
          'Request body validation failed. Please check the application configuration format.'
        );
      }

      const standardRequest = parseResult.data;
      const legacyRequest = transformToLegacySchema(standardRequest);

      try {
        const k8s = await createK8sContext(req);
        await createApp(legacyRequest, k8s);
        return res.status(204).end();
      } catch (err: any) {
        console.error('Kubernetes create application error:', err);
        return sendError(res, {
          status: 500,
          type: ErrorType.OPERATION_ERROR,
          code: ErrorCode.KUBERNETES_ERROR,
          message:
            'Failed to create application in Kubernetes cluster. Please check cluster status and permissions.',
          details: err.message
        });
      }
    } else {
      res.setHeader('Allow', ['POST']);
      return sendError(res, {
        status: 405,
        type: ErrorType.CLIENT_ERROR,
        code: ErrorCode.METHOD_NOT_ALLOWED,
        message: `HTTP method ${method} is not supported for this endpoint. Use POST to create an application.`
      });
    }
  } catch (err: any) {
    console.error('Internal error:', err);
    return sendError(res, {
      status: 500,
      type: ErrorType.INTERNAL_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message:
        'An unexpected internal error occurred while processing your request. Please try again or contact support if the issue persists.',
      details: err.message
    });
  }
}
