import { NextApiRequest, NextApiResponse } from 'next';
import allApps from '../../../mock/allApps';
import { JsonResp } from '../response';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  JsonResp(allApps, resp);
}
