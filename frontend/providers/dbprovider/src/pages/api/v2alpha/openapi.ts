import { document } from '@/types/apis/v2alpha';
import { NextApiRequest, NextApiResponse } from 'next';
import { sendError, ErrorType, ErrorCode } from '@/types/v2alpha/error';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="openapi.json"');
    return res.status(200).json(document);
  }

  return sendError(res, {
    status: 405,
    type: ErrorType.CLIENT_ERROR,
    code: ErrorCode.METHOD_NOT_ALLOWED,
    message: 'Method not allowed. Use GET.'
  });
}
