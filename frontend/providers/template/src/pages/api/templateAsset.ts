import { jsonRes } from '@/services/backend/response';
import { readTemplateAssetFile } from '@/utils/templateAssets';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';

const MIME_BY_EXT: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { templateName, asset } = req.query as {
    templateName?: string;
    asset?: string;
  };

  if (!templateName || !asset) {
    return jsonRes(res, { code: 400, message: 'templateName and asset are required.' });
  }

  try {
    const originalPath = process.cwd();
    const jsonPath = path.resolve(originalPath, 'templates.json');
    const result = readTemplateAssetFile({ jsonPath, templateName, assetUrl: asset });
    const ext = path.extname(result.path).toLowerCase();
    res.setHeader('Content-Type', MIME_BY_EXT[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).send(result.content);
  } catch (error) {
    jsonRes(res, {
      code: 404,
      message: error instanceof Error ? error.message : 'Template asset not found.'
    });
  }
}
