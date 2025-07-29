import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Test API endpoint called');
  console.log('Request method:', req.method);
  console.log('Request headers:', req.headers);

  res.status(200).json({
    message: 'Test API endpoint is working',
    timestamp: new Date().toISOString()
  });
}
