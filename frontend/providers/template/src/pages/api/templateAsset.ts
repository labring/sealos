import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

const MIME_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webp': 'image/webp'
};

function getAssetPath(queryPath: string | string[] | undefined) {
  if (!queryPath) return '';
  const value = Array.isArray(queryPath) ? queryPath[0] : queryPath;
  return typeof value === 'string' ? value : '';
}

function getSafeAssetPath(baseDir: string, assetPath: string) {
  if (!assetPath || assetPath.includes('\0') || path.posix.isAbsolute(assetPath)) return '';
  const assetPathParts = assetPath.replace(/\\/g, '/').split('/').filter(Boolean);
  if (assetPathParts.includes('..')) return '';

  const normalizedAssetPath = path.posix.normalize(assetPathParts.join('/'));
  if (
    normalizedAssetPath === '.' ||
    normalizedAssetPath === '..' ||
    normalizedAssetPath.startsWith('../')
  ) {
    return '';
  }

  const resolvedPath = path.normalize(`${baseDir}${path.sep}${normalizedAssetPath}`);
  return resolvedPath.startsWith(`${baseDir}${path.sep}`) ? resolvedPath : '';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return res.status(405).end('Method not allowed');
    }

    const assetPath = getAssetPath(req.query.path);
    const templateRoot = fs.realpathSync(path.resolve(process.cwd(), 'templates'));
    const resolvedPath = getSafeAssetPath(templateRoot, assetPath);
    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return res.status(404).end('Asset not found');
    }

    const realResolvedPath = fs.realpathSync(resolvedPath);
    if (!realResolvedPath.startsWith(`${templateRoot}${path.sep}`)) {
      return res.status(403).end('Forbidden');
    }

    const stats = fs.statSync(realResolvedPath);
    if (!stats.isFile()) {
      return res.status(404).end('Asset not found');
    }

    const contentType = MIME_TYPES[path.extname(realResolvedPath).toLowerCase()];
    if (!contentType) {
      return res.status(415).end('Unsupported asset type');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (req.method === 'HEAD') {
      return res.status(200).end();
    }

    return res.status(200).send(fs.readFileSync(realResolvedPath));
  } catch (error) {
    return res.status(404).end('Asset not found');
  }
}
