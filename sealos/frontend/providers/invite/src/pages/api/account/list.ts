import { jsonRes } from '@/services/response';
import type { NextApiRequest, NextApiResponse } from 'next';

type TRewardList = {
  invitee: string;
  inviter: string;
  amount: number;
  arrival_time: string;
  status: string;
  registerTime: string;
};

export type InvitationResult = {
  totalPeople: number;
  totalAmount: number;
  completedUsers: number;
  pendingUsers: number;
  rewardList: TRewardList[];
  pagination?: {
    total: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
  };
};

export const getInvitationList = async (
  inviterId: string,
  page: string = '1',
  pageSize: string = '10'
) => {
  const baseUrl = process.env.LAF_BASE_URL;
  const result = (await fetch(
    `https://${baseUrl}/listById?inviterId=${inviterId}&page=${page}&pageSize=${pageSize}`
  ).then((response) => response.json())) as {
    code: number;
    data: InvitationResult;
  };
  return result.data;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    const {
      inviterId,
      page = '1',
      pageSize = '10'
    } = req.query as {
      inviterId: string;
      page: string;
      pageSize: string;
    };

    const defaultObj: InvitationResult = {
      totalAmount: 0,
      totalPeople: 0,
      completedUsers: 0,
      pendingUsers: 0,
      rewardList: []
    };

    if (!inviterId) {
      return jsonRes(res, {
        data: defaultObj
      });
    }

    const data = await getInvitationList(inviterId, page, pageSize);

    return jsonRes(res, {
      data
    });
  } catch (err) {
    return jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
