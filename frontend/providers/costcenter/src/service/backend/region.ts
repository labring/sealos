import { Region } from '@/types/region';
import axios, { AxiosInstance } from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';
import { AccessTokenPayload, generateBillingToken, verifyInternalToken } from '../auth';
import { jsonRes } from './response';

export async function getRegionList() {
  const regionUrl =
    global.AppConfig.costCenter.components.accountService.url + '/account/v1alpha1/regions';
  const fetchResponse = await fetch(regionUrl, {
    method: 'POST'
  });
  const regionRes = await fetchResponse.json();
  if (!fetchResponse.ok) {
    console.log('fetch region list error:', regionRes);
    return null;
  }
  const regions: Region[] = regionRes?.regions || [];
  if (!regions) {
    console.log('region list is null');
    return null;
  }
  return regions;
}

export async function getRegionByUid(regionUid?: string) {
  const regions = await getRegionList();
  if (!regions) {
    return null;
  }
  const currentRegionIdx = regions.findIndex((region: Region) => region.uid === regionUid);
  if (currentRegionIdx === -1) {
    return null;
  }
  return regions[currentRegionIdx];
}

const accountServiceCient = axios.create({
  baseURL: 'https://open.feishu.cn/open-apis',
  headers: {
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip,deflate,compress'
  }
});

export async function makeRegionListAPIClientByHeader(req: NextApiRequest, res: NextApiResponse) {
  const token = req.body.internalToken;
  const payload = await verifyInternalToken(token);
  if (!payload) {
    jsonRes(res, { code: 401, message: 'Authorization failed' });
    return null;
  }
  const regionList = await getRegionList();
  const clientList = regionList?.map((region) => {
    const client = makeAPIClient(region, payload);
    return client;
  });
  return clientList;
}

export function makeAPIClient(
  region: Region | undefined | null,
  payload?: AccessTokenPayload
): AxiosInstance {
  const baseURL = region?.accountSvc
    ? `http://${region?.accountSvc}`
    : global.AppConfig.costCenter.components.accountService.url;
  // console.log(baseURL);
  if (!payload) {
    return axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip,deflate,compress'
      }
    });
  }
  const token = generateBillingToken({
    userUid: payload.userUid,
    userId: payload.userId
  });
  return axios.create({
    baseURL,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip,deflate,compress'
    }
  });
}
export async function makeAPIClientByHeader(req: NextApiRequest, res: NextApiResponse) {
  const token = req.body.internalToken;
  const regionUid = req.body.regionUid;
  const payload = await verifyInternalToken(token);
  if (!payload) {
    jsonRes(res, { code: 401, message: 'Authorization failed' });
    return null;
  }
  const region = await getRegionByUid(regionUid);
  const client = makeAPIClient(region, payload);
  return client;
}
