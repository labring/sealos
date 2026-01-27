import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { enableApi } from '@/services/enable';
import { prisma } from '@/services/backend/db/init';
import { getUserKubeconfigNotPatch } from '@/services/backend/kubernetes/admin';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('[API] Create template instance request received');
    console.log('[API] Request body:', req.body);

    const payload = await verifyAccessToken(req.headers);
    if (!payload) {
      console.log('[API] Authorization failed: no valid token');
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    }

    console.log('[API] User authorized:', {
      userId: payload.userId,
      workspaceId: payload.workspaceId
    });

    const userCr = await prisma.userCr.findUnique({
      where: {
        uid: payload.userCrUid
      }
    });

    if (!userCr) {
      console.log('[API] User CR not found for userId:', payload.userId);
      return jsonRes(res, {
        code: 404,
        message: 'User CR not found'
      });
    }

    console.log('[API] User CR found:', {
      crName: userCr.crName,
      userUid: userCr.userUid
    });

    const kc = await getUserKubeconfigNotPatch(userCr.crName);
    if (!kc) {
      console.log('[API] Kubeconfig not found for crName:', userCr.crName);
      return jsonRes(res, {
        code: 404,
        message: 'Kubeconfig not found'
      });
    }

    // Update kubeconfig namespace to match the current workspace
    const kcWithCorrectNamespace = switchKubeconfigNamespace(kc, payload.workspaceId);

    console.log('[API] Kubeconfig retrieved successfully, namespace:', payload.workspaceId);

    const { templateName, templateForm } = req.body as {
      templateName: string;
      templateForm: Record<string, any>;
    };

    console.log('[API] Parsed request:', {
      templateName,
      templateForm,
      templateFormType: typeof templateForm,
      templateFormKeys: templateForm ? Object.keys(templateForm) : [],
      templateFormIsEmpty: templateForm && Object.keys(templateForm).length === 0
    });

    if (!templateName) {
      console.log('[API] Validation failed: templateName is required');
      return jsonRes(res, {
        code: 400,
        message: 'templateName is required'
      });
    }

    if (templateForm === undefined || templateForm === null) {
      console.log('[API] Validation failed: templateForm cannot be undefined or null');
      return jsonRes(res, {
        code: 400,
        message: 'templateForm is required (can be empty object {})'
      });
    }

    const templateUrl = global.AppConfig?.common?.templateUrl;
    if (!templateUrl) {
      console.log('[API] Template service URL not configured');
      return jsonRes(res, {
        code: 500,
        message: 'Template service URL is not configured'
      });
    }

    const apiUrl = `${templateUrl.replace(/\/$/, '')}/api/v1alpha/createInstance`;
    const authorization = encodeURI(kcWithCorrectNamespace);

    console.log('[API] Calling template service:', {
      apiUrl,
      templateName,
      templateForm,
      authorizationType: 'kubeconfig',
      authorization,
      authorizationLength: authorization.length
    });

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

    console.log('[API] Template service response status:', response.status);

    const result = await response.json();
    console.log('[API] Template service response body:', result);

    if (!response.ok) {
      console.log('[API] Template service returned error:', {
        status: response.status,
        result
      });
      return jsonRes(res, {
        code: response.status,
        message: result.message || 'Failed to create template instance',
        data: result
      });
    }

    console.log('[API] Template instance created successfully');
    return jsonRes(res, {
      code: 200,
      data: result
    });
  } catch (error) {
    console.error('[API] Create template instance error:', error);
    return jsonRes(res, {
      code: 500,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
