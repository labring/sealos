import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { jsonRes } from '@/services/backend/response';
import { appLanuchPadClient } from '@/services/request';
import fs from 'fs/promises';
import _ from 'lodash';
import path from 'path';
import { checkSealosUserIsRealName } from '@/utils/isRealName';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const appToken = req.headers['app-token'];

    if (!appToken) {
      return jsonRes(res, { code: 403, error: 'no authorization' });
    }

    const isRealName = await checkSealosUserIsRealName(appToken as string);
    if (!isRealName) {
      return jsonRes(res, { code: 403, error: 'userNotRealName' });
    }

    const { bucket } = req.body as { bucket?: string };

    if (!bucket) return jsonRes(res, { code: 400, data: { error: 'bucketName is invaild' } });

    const domain = process.env.SEALOS_DOMAIN;

    const appName = `static-host-${bucket}`;
    const result = await appLanuchPadClient.post(
      '/createApp',
      {
        appForm: {
          appName,
          imageName: 'nginx',
          runCMD: '',
          cmdParam: '',
          replicas: 1,
          cpu: process.env.HOSTING_POD_CPU_REQUIREMENT,
          memory: process.env.HOSTING_POD_MEMORY_REQUIREMENT,
          networks: [
            {
              networkName: `network-${appName}`,
              portName: 'static-host',
              port: 80,
              protocol: 'TCP',
              openPublicDomain: true,
              publicDomain: appName,
              customDomain: '',
              domain: domain,
              appProtocol: 'HTTP',
              openNodePort: false
            }
          ],
          envs: [],
          hpa: {
            use: false,
            target: 'cpu',
            value: 50,
            minReplicas: 1,
            maxReplicas: 5
          },
          configMapList: [
            {
              mountPath: '/etc/nginx/nginx.conf',
              subPath: 'nginx.conf',
              key: 'nginx.conf',
              volumeName: 'nginx-conf',
              value: await generateNginxConfig(bucket)
            }
          ],
          secret: {
            use: false,
            username: '',
            password: '',
            serverAddress: 'docker.io'
          },
          storeList: [],
          gpu: {}
        }
      },
      {
        headers: {
          Authorization: req.headers.authorization
        }
      }
    );
    return jsonRes(res, {
      data: result.data.data
    });
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      message: 'get bucket error'
    });
  }
}

async function generateNginxConfig(bucketName: string) {
  try {
    const templatePath = path.join(process.cwd(), 'src', 'templates', 'nginx', 'site-host');
    const template = await fs.readFile(templatePath, 'utf-8');

    const compiledTemplate = _.template(template);

    const nginxConfig = compiledTemplate({ bucket: bucketName });
    return nginxConfig;
  } catch (error) {
    console.error('Error generating nginx conf', error);
    throw error;
  }
}
