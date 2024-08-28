import { Region } from '@/types/region';

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
export function makeAPIURL(region: Region | undefined | null, api: string) {
  const baseUrl = region?.accountSvc
    ? `http://${region?.accountSvc}`
    : global.AppConfig.costCenter.components.accountService.url;
  const url = baseUrl + api;
  return url;
}
