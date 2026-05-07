import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { getDeleteUserStatusByTxUid } from '@/services/backend/svc/deleteUser';
import { jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';
import { validate } from 'uuid';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return jsonRes(res, {
      code: 405,
      message: 'Method not allowed'
    });
  }

  await filterAccessToken(req, res, async ({ userUid }) => {
    const deleteId = req.query.deleteId;
    const normalizedDeleteId = Array.isArray(deleteId) ? deleteId[0] : deleteId;

    if (!normalizedDeleteId || !validate(normalizedDeleteId)) {
      return jsonRes(res, {
        code: 400,
        message: 'deleteId is invalid'
      });
    }

    const result = await getDeleteUserStatusByTxUid(userUid, normalizedDeleteId);
    if (!result) {
      return jsonRes(res, {
        code: 404,
        message: 'delete task not found'
      });
    }

    return jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: result
    });
  });
});
