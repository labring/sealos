import * as k8s from '@kubernetes/client-node';
import { DataPackType, ImageHubDataPackCRDTemplate, ImageHubDataPackMeta } from 'mock/imagehub';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApplyYaml, GetClusterObject, K8sApi } from 'services/backend/kubernetes';
import { CRDTemplateBuilder } from 'services/backend/wrapper';
import { hashAny } from 'utils/strings';
import {
  BadRequestResp,
  InternalErrorResp,
  JsonResp,
  UnprocessableResp,
  CreatedJsonResp
} from '../response';

type DataPackDesc = {
  codes: number;
  datas: any;
};

enum DataPackStatus {
  Notrun,
  Ok,
  Pending,
  Error
}

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  const { kubeconfig, image_name } = req.body;

  if (kubeconfig === '' || image_name === '') {
    return UnprocessableResp('kubeconfig or user empty', resp);
  }

  const kc = K8sApi(kubeconfig);

  const user = kc.getCurrentUser();
  if (user === null) {
    return BadRequestResp(resp);
  }

  const pack_type = DataPackType.DETAIL;
  const pack_name = hashAny(image_name, pack_type);

  try {
    const dataDesc = await GetClusterObject(kc, ImageHubDataPackMeta, pack_name);
    if (dataDesc?.body?.status) {
      const datapackDesc = dataDesc.body.status as DataPackDesc;
      if (datapackDesc.codes === DataPackStatus.Ok) {
        let result = Object.values(datapackDesc.datas);
        return JsonResp(result, resp);
      }
      return JsonResp(datapackDesc, resp);
    }
  } catch (err) {
    // console.log(err);
  }

  const images = [image_name];
  const datapackCRD = CRDTemplateBuilder(ImageHubDataPackCRDTemplate, {
    pack_name,
    pack_type,
    images
  });

  try {
    const result = await ApplyYaml(kc, datapackCRD);
    return CreatedJsonResp(result, resp);
  } catch (err) {
    return InternalErrorResp(String(err), resp);
  }
}
