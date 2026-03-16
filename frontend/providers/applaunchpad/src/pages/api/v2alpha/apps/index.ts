import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  CreateLaunchpadRequestSchema,
  transformToLegacySchema,
  transformFromLegacySchema
} from '@/types/v2alpha/request_schema';
import { createApp, getAppByName, listApps } from '@/services/backend';
import { adaptAppDetail } from '@/utils/adapt';
import { DeployKindsType, AppDetailType } from '@/types/app';
import { z } from 'zod';
import { LaunchpadApplicationSchema } from '@/types/v2alpha/schema';

import { sendError, sendValidationError, ErrorType, ErrorCode } from '@/types/v2alpha/error';
import {
  getK8sContextOrSendError,
  sendK8sOperationError,
  sendInternalError
} from '@/pages/api/v2alpha/k8sContext';
import { Config } from '@/config';

async function processAppResponse(
  response: PromiseSettledResult<any>[],
  namespace: string
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
    domain: Config().cloud.domain,
    userDomains: Config().cloud.userDomains
  });
  const standardizedData = transformFromLegacySchema(appDetailData, undefined, namespace);
  const validatedData = LaunchpadApplicationSchema.parse(standardizedData);
  return validatedData;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;

    if (method === 'GET') {
      const k8s = await getK8sContextOrSendError(req, res);
      if (!k8s) return;
      try {
        const apps = await listApps(k8s);
        return res.status(200).json(apps);
      } catch (err) {
        return sendK8sOperationError(res, err, 'Failed to list applications.');
      }
    } else if (method === 'POST') {
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

      const k8s = await getK8sContextOrSendError(req, res);
      if (!k8s) return;

      try {
        await createApp(legacyRequest, k8s);
        const response = await getAppByName(standardRequest.name, k8s);
        const appData = await processAppResponse(response, k8s.namespace);
        return res.status(201).json(appData);
      } catch (err) {
        console.error('Kubernetes create application error:', err);
        return sendK8sOperationError(
          res,
          err,
          'Failed to create application in Kubernetes cluster. Please check cluster status and permissions.'
        );
      }
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return sendError(res, {
        status: 405,
        type: ErrorType.CLIENT_ERROR,
        code: ErrorCode.METHOD_NOT_ALLOWED,
        message: `HTTP method ${method} is not supported for this endpoint. Use GET to list or POST to create an application.`
      });
    }
  } catch (err) {
    console.error('Internal error:', err);
    return sendInternalError(
      res,
      err,
      'An unexpected internal error occurred while processing your request. Please try again or contact support if the issue persists.'
    );
  }
}
