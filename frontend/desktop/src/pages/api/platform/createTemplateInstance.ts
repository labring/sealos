import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { enableApi } from '@/services/enable';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) {
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    }

    const { templateName, templateForm } = req.body as {
      templateName: string;
      templateForm: Record<string, any>;
    };

    if (!templateName || !templateForm) {
      return jsonRes(res, {
        code: 400,
        message: 'templateName and templateForm are required'
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
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.authorization || ''
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
    console.error('Create template instance error:', error);
    return jsonRes(res, {
      code: 500,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
