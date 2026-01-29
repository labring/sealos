import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { enableApi } from '@/services/enable';
import { prisma } from '@/services/backend/db/init';
import { getUserKubeconfigNotPatch } from '@/services/backend/kubernetes/admin';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) {
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    }

    const userCr = await prisma.userCr.findUnique({
      where: {
        uid: payload.userCrUid
      }
    });

    if (!userCr) {
      return jsonRes(res, {
        code: 404,
        message: 'User CR not found'
      });
    }

    const kc = await getUserKubeconfigNotPatch(userCr.crName);
    if (!kc) {
      return jsonRes(res, {
        code: 404,
        message: 'Kubeconfig not found'
      });
    }

    // Update kubeconfig namespace to match the current workspace
    const kcWithCorrectNamespace = switchKubeconfigNamespace(kc, payload.workspaceId);

    const { templateName, templateForm } = req.body as {
      templateName: string;
      templateForm: Record<string, any>;
    };

    if (!templateName) {
      return jsonRes(res, {
        code: 400,
        message: 'templateName is required'
      });
    }

    if (templateForm === undefined || templateForm === null) {
      return jsonRes(res, {
        code: 400,
        message: 'templateForm is required (can be empty object {})'
      });
    }

    const templateUrl = global.AppConfig?.common?.templateUrl;
    if (!templateUrl) {
      return jsonRes(res, {
        code: 500,
        message: 'Template service URL is not configured'
      });
    }

    const apiUrl = `${templateUrl.replace(/\/$/, '')}/api/v1alpha/createInstance`;
    const authorization = encodeURI(kcWithCorrectNamespace);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization
      },
      body: JSON.stringify({
        templateName,
        templateForm
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return jsonRes(res, {
        code: response.status,
        message: result.message || 'Failed to create template instance',
        data: result
      });
    }

    return jsonRes(res, {
      code: 200,
      data: result
    });
  } catch (error) {
    console.error('[API] CreateTemplateInstance:', error);
    return jsonRes(res, {
      code: 500,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
