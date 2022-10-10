// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import * as k8s from '@kubernetes/client-node';
import { ApplyYaml, CRDMeta, GetCRD, K8sApi,GetUserDefaultNameSpace } from '../../../services/backend/kubernetes';
import { CRDTemplateBuilder } from '../../../services/backend/wrapper';
import { infraCRDTemplate,clusterCRDTemplate } from '../../../mock/infra';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const config = req.body.kubeconfig
  const kc = K8sApi(config)
  const kube_user = kc.getCurrentUser();
  if (kube_user === null) {
    res.status(400)
    return ;
  }
  const infra_name = 'huruizhe-3' //用UUID随机生成替代
  const masterType:string = req.body.masterType
  const nodeType:string = req.body.nodeType
  const masterCount:number = req.body.masterCount
  const nodeCount:number = req.body.nodeCount
  const namespace = GetUserDefaultNameSpace(kube_user.name);
  const infraCRD = CRDTemplateBuilder(infraCRDTemplate, {
    infra_name,
    namespace,
    masterCount,
    masterType,
    nodeCount,
    nodeType
  });
  try{
    const res = await ApplyYaml(kc, infraCRD);
  }catch(err){
    if (err instanceof k8s.HttpError) {
      console.log(err.body.message)
    }
    console.log(err)
  }
  const cluster_name = "test" //用UUID替代
  const image1 = req.body.images.image1
  const image2 = req.body.images.image2
  const clusterCRD = CRDTemplateBuilder(clusterCRDTemplate, {
    cluster_name,
    namespace,
    infra_name,
    image1,
    image2
  });
  console.log(infraCRD);
  console.log(clusterCRD);
  try{
    const res = await ApplyYaml(kc, clusterCRD);
  }catch(err){
    if (err instanceof k8s.HttpError) {
      console.log(err.body.message)
    }
    console.log(err)
  }
  res.status(200).json({ value: 'success' })

}
    // export default async function handler(
    //   req: NextApiRequest,
    //   res: NextApiResponse,
    // ) {
    //     try{
    //       const config = req.body.kubeconfig
    //       const kc = K8sApi(config)
    //       const kube_user = kc.getCurrentUser();
    //       if (kube_user === null) {
    //         return res.status(404);
    //       }
    //       const infra_meta: CRDMeta = {
    //         group: 'infra.sealos.io',
    //         version: 'v1',
    //         namespace: GetUserDefaultNameSpace(kube_user.name),
    //         plural: 'infras'
    //       };
    //       const infraDesc = await GetCRD(kc, infra_meta,infra_name)
    //       console.log(infraDesc.body.spec)
    //       console.log("infraDesc.body.status:",infraDesc.body.status)
    //     }catch(err){
    //       if (err instanceof k8s.HttpError) {
    //         console.log(err.body.message)
    //       }
    //       console.log(err)
    //     }
        
    //     console.log(req.body.masterType)
    //     console.log(req.body.masterCount);
    //     console.log(req.body.nodeType);
    //     console.log(req.body.nodeCount);
    //     console.log(req.body.image1);
    //     console.log(req.body.image2);
        
    //     res.status(200).json({ name: 'John Doe' })
    
    //   }