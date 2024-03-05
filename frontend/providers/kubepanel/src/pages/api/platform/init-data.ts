import { NextApiRequest, NextApiResponse } from 'next';

export type Response = {
  SEALOS_DOMAIN: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse<Response>>
) {
  res.status(200).json({
    code: 200,
    data: { SEALOS_DOMAIN: process.env.SEALOS_DOMAIN || 'cloud.sealos.io' }
  });
}
