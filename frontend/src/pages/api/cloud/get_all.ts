import type { NextApiRequest, NextApiResponse } from 'next';
import type { IframePage } from '../../../interfaces/cloud';
import { BadRequestResp, JsonResp } from '../response';
import { urls } from './def';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  if (req.method !== 'GET') {
    return BadRequestResp(resp);
  }

  const respArr: IframePage[] = Array.from(urls.values());
  return JsonResp(respArr, resp);
}
