import { NextApiRequest, NextApiResponse } from 'next';
import { JsonResp } from '../response';
import allApps from './allApps';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  JsonResp(allApps, resp);
}
