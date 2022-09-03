import installedApps from './installedApps';
import { NextApiRequest, NextApiResponse } from 'next';
import { JsonResp, ResCode, ResStatusCode } from '../response';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  JsonResp(installedApps, resp);
}
