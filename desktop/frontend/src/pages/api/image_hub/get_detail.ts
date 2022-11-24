import * as k8s from '@kubernetes/client-node';
import { DataPackType, ImageHubDataPackCRDTemplate, ImageHubDataPackMeta } from 'mock/imagehub';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApplyYaml, GetCRD, K8sApi } from 'services/backend/kubernetes';
import { CRDTemplateBuilder } from 'services/backend/wrapper';
import { hashAny } from 'utils/strings';
import { BadRequestResp, InternalErrorResp, JsonResp, UnprocessableResp } from '../response';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  if (req.method !== 'GET') {
    return BadRequestResp(resp);
  }

  const { kubeconfig, image_name } = req.body;
  // console.log(req.body);
  if (kubeconfig === '' || image_name === '') {
    return UnprocessableResp('kubeconfig or user empty', resp);
  }

  const kc = K8sApi(kubeconfig);

  // get user account payment amount

  const user = kc.getCurrentUser();
  if (user === null) {
    return BadRequestResp(resp);
  }

  const pack_type = DataPackType.DETAIL;
  // get images hash for name
  const pack_name = hashAny(image_name, pack_type);

  type dataStatus = {
    name: string;
  };

  try {
    const dataDesc = await GetCRD(kc, ImageHubDataPackMeta, pack_name);
    if (dataDesc !== null && dataDesc.body !== null && dataDesc.body.status !== null) {
      const dataStatus = dataDesc.body.status as dataStatus;
      return JsonResp(dataStatus, resp);
    }
  } catch (err) {
    console.log(err);

    if (err instanceof k8s.HttpError) {
      if (err.body.code !== 404) {
        // 非404, 返回错误
        return InternalErrorResp(err.body.message, resp);
      }
      // 其他情况可以继续
    } else {
      return InternalErrorResp(String(err), resp);
    }
  }

  // apply crd 然后返回让前端等待
  const namespace = ImageHubDataPackMeta.namespace;
  const images = [image_name];
  const datapackCRD = CRDTemplateBuilder(ImageHubDataPackCRDTemplate, {
    pack_name,
    namespace,
    pack_type,
    images
  });

  try {
    const res = await ApplyYaml(kc, datapackCRD);
    console.log(res);
    JsonResp({}, resp);
  } catch (err) {
    return InternalErrorResp(String(err), resp);
  }

  return InternalErrorResp('get data failed', resp);
}
