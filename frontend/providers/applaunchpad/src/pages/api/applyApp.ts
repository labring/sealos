import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import yaml from 'js-yaml';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const namespace = req.query.namespace as string;
  const handleType = req.query.handleType as 'create' | 'replace';
  const { yamlList }: { yamlList: string[] } = req.body;

  console.log(req.body);
  console.log(handleType);
  console.log(yamlList);
  console.log(namespace);

  let new_yamlList: any[] = [];

  const MOUNT_PATH = process.env.GLOBAL_CONFIGMAP_PATH || '';
  const CONFIG_MAP_NAME = process.env.GLOBAL_CONFIGMAP_NAME || '';

  if (MOUNT_PATH && CONFIG_MAP_NAME) {

    yamlList.forEach((yamlstr: any) => {
      const yamlobj: any = yaml.load(yamlstr);
      if (yamlobj.kind === 'Deployment' || yamlobj.kind === 'StatefulSet') {
        // Ensure volumes array exists
        if (!yamlobj.spec.template.spec.volumes) {
          yamlobj.spec.template.spec.volumes = [];
        }

        // check if the volume already exists
        if (yamlobj.spec.template.spec.volumes.find((v: any) => v.name === CONFIG_MAP_NAME)) {
        } else {
    
          // Add the ConfigMap volume
          yamlobj.spec.template.spec.volumes.push({
            name: CONFIG_MAP_NAME,
            configMap: {
              name: CONFIG_MAP_NAME,
            },
          });
        }
    
        // Ensure containers array exists
        if (yamlobj.spec.template.spec.containers) {
          yamlobj.spec.template.spec.containers.forEach((container: any) => {
            // Ensure volumeMounts array exists
            if (!container.volumeMounts) {
              container.volumeMounts = [];
            }

            // check if the volumeMount already exists
            if (container.volumeMounts.find((vm: any) => vm.name === CONFIG_MAP_NAME)) {
            } else {
              
              // Add the volumeMount
              container.volumeMounts.push({
                name: CONFIG_MAP_NAME,
                mountPath: MOUNT_PATH,
              });
            }
          });
        }
      }
      new_yamlList.push(yaml.dump(yamlobj));
    });
  }

  // console.log(new_yamlList);

  if (!new_yamlList?.length) {
    jsonRes(res, {
      code: 500,
      error: 'params error'
    });
    return;
  }
  try {
    const { applyYamlList } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const applyRes = await applyYamlList(new_yamlList, handleType ?? 'create', namespace);

    jsonRes(res, { data: applyRes.map((item) => item.kind) });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
