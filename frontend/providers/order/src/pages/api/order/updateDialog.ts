import { AuthAdmin, authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { addDialogToOrder, updateOrder } from '@/services/db/order';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });
    const isAdmin = AuthAdmin(namespace);

    const { orderID, content } = req.body as {
      orderID: string;
      content: string;
    };

    await updateOrder({ orderID, userID: namespace, updates: { status: 'processing' } });

    const result = await addDialogToOrder({
      orderID,
      userID: namespace,
      dialog: {
        userID: namespace,
        time: new Date(),
        content: content,
        isAdmin: isAdmin
      }
    });

    return jsonRes(res, {
      data: result
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
