import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/service/backend/response';
import { authSession } from '@/service/backend/auth';
import { getAllInvoicesByK8sUser } from '@/service/backend/db/invoice';
import { enableInvoice } from '@/service/enabled';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!enableInvoice()) {
      throw new Error('invoice is not enabled');
    }
    const kc = await authSession(req.headers);
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(res, { code: 401, message: 'user null' });
    }
    const invoices = await getAllInvoicesByK8sUser({ k8s_user: user.name });

    return jsonRes(res, {
      message: 'successfully',
      data: {
        billings: invoices.flatMap((invoice) => invoice.billings.map((billing) => billing.order_id))
      },
      code: 200
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, {
      message: 'Failed to get billings',
      code: 500
    });
  }
}
