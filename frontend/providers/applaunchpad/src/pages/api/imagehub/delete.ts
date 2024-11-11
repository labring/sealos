import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { NextApiRequest, NextApiResponse } from 'next';
import { ImageRegistryClient } from './get';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { repository, tag } = req.query;
    console.log(repository, tag, 'repository, tag');

    if (typeof repository !== 'string' || typeof tag !== 'string') {
      return jsonRes(res, {
        code: 400,
        error: new Error('Invalid repository or tag')
      });
    }

    const client = new ImageRegistryClient({
      baseUrl: process.env.IMAGE_REPO_URL!,
      username: process.env.IMAGE_REPO_USERNAME!,
      password: process.env.IMAGE_REPO_PASSWORD!
    });

    const success = await client.deleteImage(repository, tag);
    if (success) {
      return jsonRes(res, { data: 'Image deleted successfully' });
    } else {
      return jsonRes(res, {
        code: 500,
        error: new Error('Failed to delete image')
      });
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return jsonRes(res, {
      code: 500,
      error: error instanceof Error ? error : new Error('Internal server error')
    });
  }
}
