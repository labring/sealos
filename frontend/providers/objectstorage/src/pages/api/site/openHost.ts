import type { NextApiRequest, NextApiResponse } from 'next';
import { initK8s } from 'sealos-desktop-sdk/service';
import { ApiResp } from '@/services/kubernet';
import { jsonRes } from '@/services/backend/response';
import { appLanuchPadClient } from '@/services/request';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const client = await initK8s({ req });
    const { bucket } = req.body as { bucket?: string };
    if (!bucket) return jsonRes(res, { code: 400, data: { error: 'bucketName is invaild' } });
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
          cpu: 200,
          memory: 128,
          networks: [
            {
              networkName: `network-${appName}`,
              portName: 'static-host',
              port: 80,
              protocol: 'HTTP',
              openPublicDomain: true,
              publicDomain: appName,
              customDomain: ''
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
              value: `user  nginx;
    worker_processes  auto;
      
    error_log  /var/log/nginx/error.log notice;
    pid        /var/run/nginx.pid;
      
      
    events {
        worker_connections  1024;
    }
      
      
    http {
        
        proxy_intercept_errors on;
        
        server {
            listen 80;
            
            error_page 404 = /404.html;

            location / {
              rewrite ^/404\\.html$ /${bucket}/404.html break;
              rewrite ^/$ /${bucket}/index.html break;
              rewrite ^/(.+)/$ /${bucket}/$1/index.html break;
              rewrite ^/(.*\\..*)$ /${bucket}/$1 break;
              rewrite ^/(.+)$ /${bucket}/$1/index.html break;
              
              proxy_pass http://object-storage.objectstorage-system.svc.cluster.local;
            }
        }
        
        sendfile  on;
    }`
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
