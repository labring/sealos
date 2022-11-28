import * as k8s from '@kubernetes/client-node';
import {
  DataPackType,
  ImageHubDataPackCRDTemplate,
  ImageHubDataPackMeta,
  RepositoryMeta
} from 'mock/imagehub';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApplyYaml, GetCRD, K8sApi, ListCRD } from 'services/backend/kubernetes';
import { CRDTemplateBuilder } from 'services/backend/wrapper';
import { hashAny } from 'utils/strings';
import { BadRequestResp, InternalErrorResp, JsonResp, UnprocessableResp } from '../response';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  if (req.method !== 'GET') {
    return BadRequestResp(resp);
  }

  const { kubeconfig } = req.body;
  // console.log(req.body);
  if (kubeconfig === '') {
    return UnprocessableResp('kubeconfig or user empty', resp);
  }

  const kc = K8sApi(kubeconfig);

  // get user account payment amount

  const user = kc.getCurrentUser();
  if (user === null) {
    return BadRequestResp(resp);
  }

  type repositoryStatus = {
    items: Array<any>;
  };

  let images_names: Array<string> = [];

  try {
    const dataDesc = await ListCRD(kc, RepositoryMeta);
    if (dataDesc !== null && dataDesc.body !== null) {
      const dataStatus = dataDesc.body as repositoryStatus;
      for (const i in dataStatus.items) {
        images_names.push(
          dataStatus.items[i].spec.name + ':' + dataStatus.items[i].spec.latestTag.name
        );
      }
    }
  } catch (err) {
    console.log(err);

    if (err instanceof k8s.HttpError) {
      return InternalErrorResp(err.body.message, resp);
    }
  }

  const pack_type = DataPackType.GRID;
  // get images hash for names
  const pack_name = hashAny(images_names, pack_type);

  type dataStatus = {
    detail: string;
    icon: string;
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
  const images = images_names;
  const datapackCRD = CRDTemplateBuilder(ImageHubDataPackCRDTemplate, {
    pack_name,
    namespace,
    pack_type,
    images
  });
  console.log(datapackCRD);

  try {
    const res = await ApplyYaml(kc, datapackCRD);
    JsonResp(res, resp);
  } catch (err) {
    return InternalErrorResp(String(err), resp);
  }

  return InternalErrorResp('get data failed', resp);
}
