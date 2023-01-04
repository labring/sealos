import * as k8s from '@kubernetes/client-node';
import {
  DataPackType,
  ImageHubDataPackCRDTemplate,
  ImageHubDataPackMeta,
  RepositoryMeta
} from 'mock/imagehub';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  ApplyYaml,
  GetClusterObject,
  K8sApi,
  ListClusterObject
} from 'services/backend/kubernetes';
import { CRDTemplateBuilder } from 'services/backend/wrapper';
import { hashAny } from 'utils/strings';
import { BadRequestResp, InternalErrorResp, JsonResp, UnprocessableResp } from '../response';

type repositoryStatus = {
  items: {
    spec: {
      name: string;
    };
    status: {
      latestTag: {
        creatTime: string;
        name: string;
      };
    };
  }[];
};

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
  const { kubeconfig, labels } = req.body;

  if (kubeconfig === '') {
    return UnprocessableResp('kubeconfig or user empty', resp);
  }

  const kc = K8sApi(kubeconfig);
  const user = kc.getCurrentUser();

  if (user === null) {
    return BadRequestResp(resp);
  }

  let images_names: Array<string> = [];

  try {
    const repositoryDesc = await ListClusterObject(kc, RepositoryMeta, labels);
    if (repositoryDesc?.body) {
      const result = repositoryDesc.body as repositoryStatus;
      for (const item of result.items) {
        images_names.push(item.spec.name + ':' + item.status.latestTag.name);
      }
    }
    // return JsonResp(repositoryDesc.body, resp);
  } catch (err) {
    console.log(err, 'list');
    if (err instanceof k8s.HttpError) {
      return InternalErrorResp(err.body.message, resp);
    }
  }

  const pack_type = DataPackType.GRID;
  const pack_name = hashAny(images_names, pack_type);

  try {
    const dataDesc = await GetClusterObject(kc, ImageHubDataPackMeta, pack_name);
    if (dataDesc?.body?.status) {
      const datapackDesc = dataDesc.body.status as DataPackDesc;
      if (datapackDesc.codes === DataPackStatus.Ok) {
        let result = Object.values(datapackDesc.datas);
        return JsonResp({ items: result, code: 200 }, resp);
      }
      return JsonResp(datapackDesc, resp);
    }
  } catch (err) {
    // console.log(err, 'err datapack');
  }

  const images = images_names;
  const datapackCRD = CRDTemplateBuilder(ImageHubDataPackCRDTemplate, {
    pack_name,
    pack_type,
    images
  });

  try {
    const result = await ApplyYaml(kc, datapackCRD);
    return JsonResp({ ...result, code: 201 }, resp);
  } catch (err) {
    return InternalErrorResp(String(err), resp);
  }
}
