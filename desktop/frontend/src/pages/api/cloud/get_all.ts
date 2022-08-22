import type { NextRequest } from 'next/server';
import type { NextApiRequest, NextApiResponse } from 'next';
import { BadRequestResp, JsonResp } from '../response';
import { urls } from './def';
import type { IframePage } from '../../../interfaces/cloud';

// // use edge api
// export const config = {
//   runtime: 'experimental-edge'
// };

// export default async function handler(req: NextRequest) {
//   if (req.method !== 'GET') {
//     return BadRequestResp();
//   }

//   const respArr: IframePage[] = Array.from(urls.values());
//   return JsonResp(respArr);
// }

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  if (req.method !== 'GET') {
    return BadRequestResp(resp);
  }

  const respArr: IframePage[] = Array.from(urls.values());
  return JsonResp(respArr, resp);
}
