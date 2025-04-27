import { NextRequest } from 'next/server';
import { nanoid } from '@/utils/tools';
import { jsonRes } from '@/services/backend/response';
import { devboxIdKey } from '@/constants/devbox';
import { DeployDevboxRequestSchema, DeployDevboxHeaderSchema } from './schema';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedBody = DeployDevboxRequestSchema.parse(body);
    const { devboxName, tag, cpu = 200, memory = 128 } = validatedBody;
    const headerList = req.headers;

    const headers = {
      Authorization: headerList.get('Authorization') || ''
    };
    DeployDevboxHeaderSchema.parse(headers);

    const appName = `${devboxName}-release-${nanoid()}`;
    const image = `${process.env.REGISTRY_ADDR}/${process.env.NAMESPACE}/${devboxName}:${tag}`;
    const formData = {
      appForm: {
        appName,
        imageName: image,
        runCMD: '/bin/bash -c', // FIXME: Currently using static data here (switching to dynamic requires many changes), will use dynamic method later
        cmdParam: '/home/devbox/project/entrypoint.sh',
        replicas: 1,
        labels: {
          [devboxIdKey]: devboxName
        },
        cpu,
        memory,
        networks: [
          {
            networkName: `network-${appName}`,
            portName: 'host',
            port: 80,
            protocol: 'TCP',
            publicDomain: '',
            openPublicDomain: true,
            customDomain: '',
            domain: process.env.INGRESS_DOMAIN || '',
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
        configMapList: [],
        secret: {
          use: false,
          username: '',
          password: '',
          serverAddress: 'docker.io'
        },
        storeList: [],
        gpu: {}
      }
    };

    const fetchResponse = await fetch(
      `https://applaunchpad.${process.env.SEALOS_DOMAIN}/api/v1alpha/createApp`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: headers.Authorization
        },
        body: JSON.stringify(formData)
      }
    );

    const responseData = await fetchResponse.json();

    const ingressResource = responseData.data.find((item: any) => item.kind === 'Ingress');
    const publicDomains =
      ingressResource?.spec?.rules?.map((rule: any) => rule.host) || ([] as string[]);

    const response = {
      data: {
        message: 'success deploy devbox',
        appName,
        publicDomains
      }
    };

    return jsonRes(response);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return jsonRes({
        code: 400,
        error: err.errors
      });
    }
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
