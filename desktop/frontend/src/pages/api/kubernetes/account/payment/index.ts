import * as k8s from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';
import { paymentCRDTemplate } from '../../../../../mock/user';
import {
  ApplyYaml,
  GetUserDefaultNameSpace,
  K8sApi
} from '../../../../../services/backend/kubernetes';
import { CRDTemplateBuilder } from '../../../../../services/backend/wrapper';
import { BadRequestResp, InternalErrorResp, JsonResp, UnprocessableResp } from '../../../response';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  if (req.method !== 'POST') {
    return BadRequestResp(resp);
  }

  const { kubeconfig, amount } = req.body;
  // console.log(req.body);
  if (kubeconfig === '' || amount <= 0) {
    return UnprocessableResp('kubeconfig or user', resp);
  }

  const kc = K8sApi(kubeconfig);

  const kube_user = kc.getCurrentUser();
  if (kube_user === null) {
    return BadRequestResp(resp);
  }

  // do payment

  type paymentResp = {
    payment_name: string;
    extra?: any;
  };

  const payment_name = crypto.randomUUID();
  const namespace = GetUserDefaultNameSpace(kube_user.name);
  const paymentCRD = CRDTemplateBuilder(paymentCRDTemplate, {
    payment_name,
    namespace,
    amount,
    kube_user
  });
  console.log(paymentCRD);

  // here res is array of length=1
  try {
    const res = await ApplyYaml(kc, paymentCRD);
    return JsonResp(
      {
        payment_name: payment_name,
        extra: res[0]
      } as paymentResp,
      resp
    );
  } catch (err) {
    // console.log(err);
    if (err instanceof k8s.HttpError) {
      return InternalErrorResp(err.body.message, resp);
    }

    return UnprocessableResp('create payment fail', resp);
  }
}
