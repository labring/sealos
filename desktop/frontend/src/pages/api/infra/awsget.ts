import type { NextApiRequest, NextApiResponse } from 'next'
import * as k8s from '@kubernetes/client-node';
import { CRDMeta, GetCRD, K8sApi,GetUserDefaultNameSpace } from '../../../services/backend/kubernetes';


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    const config = req.body.kubeconfig
    const kc = K8sApi(config)
    const kube_user = kc.getCurrentUser();
    const infra_name = req.body.infra_name
    if (kube_user === null) {
        return res.status(404);
    }
    const infra_meta: CRDMeta = {
        group: 'infra.sealos.io',
        version: 'v1',
        namespace: GetUserDefaultNameSpace(kube_user.name),
        plural: 'infras'
    };
    try{
        const infraDesc = await GetCRD(kc, infra_meta,infra_name)
        console.log(infraDesc.body.spec)
        console.log("infraDesc.body.status:",infraDesc.body.status)
    }catch(err){
        if (err instanceof k8s.HttpError) {
            console.log(err.body.message)
        }
        console.log(err)
    }

    res.status(200).json({ name: 'John Doe' })

}