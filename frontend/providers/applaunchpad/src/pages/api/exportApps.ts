import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import { GetAppByAppName } from './getAppByAppName';
import YAML from 'js-yaml';
import { adaptAppDetail } from '@/utils/adapt';
import { DeployKindsType } from '@/types/app';

export type ExportMultipleAppsPayload = {
  apps: {
    yaml: string;
    images: { name: string }[];
    appname: string;
    namespace: string;
  }[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const SERVER_BASE_URL = process.env.SERVER_BASE_URL || '';

    await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const { appNames, namespace } = req.body as { appNames: string[]; namespace: string };

    if (appNames.length === 0) {
      return jsonRes(res, {
        code: 400,
        error: 'appNames is empty'
      });
    }

    const appsData: ExportMultipleAppsPayload = { apps: [] };

    for (const appName of appNames) {
      try {
        const response = await GetAppByAppName({
          appName,
          req: {
            headers: req.headers,
            query: {
              ...req.query,
              namespace
            }
          } as unknown as NextApiRequest
        });

        // 过滤掉空字符串，只保留有效的 DeployKindsType 对象
        const validResponseData = response
          .map((item) => {
            if (item.status === 'fulfilled') return item.value.body;
            if (+item.reason?.body?.code === 404) return null;
            throw new Error('Get APP Deployment Error');
          })
          .filter((item): item is DeployKindsType => item !== null)
          .flat();

        if (validResponseData.length > 0) {
          const appDetail = adaptAppDetail(validResponseData);

          const appImages = appDetail.containers.map((container) => {
            const imageName = container.imageName || '';
            if (!imageName.includes('sealos.hub:5000')) {
              return { name: `sealos.hub:5000/${imageName}` };
            } else {
              return { name: imageName };
            }
          });

          const appYamlString = appDetail.crYamlList.map((item) => YAML.dump(item)).join('---\n');

          // 添加到应用列表
          appsData.apps.push({
            yaml: appYamlString,
            images: appImages,
            appname: appName,
            namespace: namespace
          });
        }
      } catch (error) {
        console.error(`获取应用 ${appName} 详情失败:`, error);
      }
    }

    if (appsData.apps.length === 0) {
      return jsonRes(res, {
        code: 400,
        error: '没有应用可导出或获取应用信息失败'
      });
    }

    // console.log('appsData', appsData);

    // 调用后端API导出应用
    const temp = await fetch(`${SERVER_BASE_URL}/api/exportApps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(appsData)
    });

    const result = (await temp.json()) as {
      message: string;
      path: string;
      url: string;
      error?: string;
    };

    console.log('export apps result:', result);

    jsonRes(res, {
      data: 'success'
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
