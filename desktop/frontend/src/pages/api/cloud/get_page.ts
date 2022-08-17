import type { NextRequest } from 'next/server';
import type { NextApiRequest, NextApiResponse } from 'next';
import { BadRequestResp, NotFoundResp, JsonResp } from '../response';
import { urls } from './def';

// // use edge api
// export const config = {
//   runtime: 'experimental-edge'
// };

// export default async function handler(req: NextRequest) {
//   if (req.method !== 'GET') {
//     return BadRequestResp();
//   }

//   const { searchParams } = new URL(req.url);
//   const name = searchParams.get('name');

//   if (name && name !== '' && urls.has(name) === true) {
//     return JsonResp(urls.get(name));
//   }
//   return NotFoundResp();
// }

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
