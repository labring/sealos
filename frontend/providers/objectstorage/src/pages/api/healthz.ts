import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  return res.status(200).json({
    status: 'ok',
    service: 'objectstorage'
  });
}
