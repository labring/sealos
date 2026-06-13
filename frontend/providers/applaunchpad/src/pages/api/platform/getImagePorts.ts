import { getImageExposedPorts } from '@/utils/image-exposed-ports';
import { authSession } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { isImagePortsEnabled } from '@/utils/feature-gates';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return jsonRes(res, {
      code: 405,
      error: `Method ${req.method} Not Allowed`
    });
  }

  if (!isImagePortsEnabled()) {
    return jsonRes(res, {
      code: 404,
      error: 'Image port detection is disabled'
    });
  }

  try {
    await authSession(req.headers);

    const { imageName, imageRegistry } = req.body as {
      imageName?: string;
      imageRegistry?: {
        username?: string;
        password?: string;
        serverAddress?: string;
      };
    };

    const normalizedImageName = imageName?.trim();

    if (!normalizedImageName) {
      return jsonRes(res, {
        code: 400,
        error: 'imageName is required'
      });
    }

    if (normalizedImageName.length > 512) {
      return jsonRes(res, {
        code: 400,
        error: 'imageName is too long'
      });
    }

    const ports = await getImageExposedPorts(normalizedImageName, imageRegistry);
    return jsonRes(res, { data: { ports } });
  } catch (error: any) {
    if (error === 'unAuthorization') {
      return jsonRes(res, {
        code: 401,
        error: 'Unauthorized'
      });
    }

    return jsonRes(res, {
      code: 400,
      error: error?.message || error
    });
  }
}
