import { NextApiRequest, NextApiResponse } from 'next';
import { JsonResp } from '../response';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  JsonResp({ url: '' }, resp);
}
