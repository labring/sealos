import { jsonRes } from '@/services/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export type InvitationResult = {
  totalPeople: string;
  totalAmount: number;
  rewardList: {
    invitee: string;
    inviter: string;
    amount: number;
    arrival_time: Date;
    status: 1;
  }[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    const { inviterId } = req.query;
    const baseUrl = process.env.LAF_BASE_URL;

    const defaultObj: InvitationResult = {
      totalAmount: 0,
      totalPeople: '0',
      rewardList: []
    };

    if (!inviterId) {
      return jsonRes(res, {
        data: defaultObj
      });
    }

    const result = await fetch(`https://${baseUrl}/listById?inviterId=${inviterId}`).then(
      (response) => response.json()
    );

    jsonRes(res, result);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
