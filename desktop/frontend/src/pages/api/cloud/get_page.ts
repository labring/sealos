import type { NextApiRequest, NextApiResponse } from 'next';
import { BadRequestResp, NotFoundResp, JsonResp } from '../response';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  if (req.method !== 'GET') {
    return BadRequestResp(resp);
  }

  const { name } = req.query;

  if (name && name !== '') {
    return JsonResp(name, resp);
  }
  return NotFoundResp(resp);
}
