import { getAuthClientConfig } from '@/pages/api/platform/getAuthConfig';
import { getCloudConfig } from '@/pages/api/platform/getCloudConfig';
import { getLayoutConfig } from '@/pages/api/platform/getLayoutConfig';
import {
  commitTransactionjob,
  finishTransactionJob,
  runTransactionjob
} from '@/services/backend/cronjob';
import { jsonRes } from '@/services/backend/response';
import {
  AppClientConfigType,
  AuthClientConfigType,
  CloudConfigType,
  CommonClientConfigType,
  DefaultAppClientConfig,
  LayoutConfigType,
  TrackingConfigType
} from '@/types/system';
import { Cron } from 'croner';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCommonClientConfig } from './getCommonConfig';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const config = await getAppConfig();
  jsonRes(res, {
    data: config,
    code: 200
  });
}

function genResConfig(
  cloudConf: CloudConfigType,
  authConf: AuthClientConfigType,
  commonConf: CommonClientConfigType,
  layoutConf: LayoutConfigType,
  tracking: Required<TrackingConfigType>
): AppClientConfigType {
  return {
    cloud: cloudConf,
    common: commonConf,
    desktop: {
      auth: authConf,
      layout: layoutConf
    },
    tracking: tracking
  };
}

export async function getAppConfig(): Promise<AppClientConfigType> {
  try {
    const cloudConf = await getCloudConfig();
    const authConf = await getAuthClientConfig();
    const commonConf = await getCommonClientConfig();
    const layoutConf = await getLayoutConfig();
    const appConfig = global.AppConfig;
    const tracking: Required<TrackingConfigType> = {
      websiteId: appConfig?.tracking?.websiteId || '',
      hostUrl: appConfig?.tracking?.hostUrl || ''
    };
    const conf = genResConfig(cloudConf, authConf, commonConf, layoutConf, tracking);
    if (!global.commitCroner) {
      // console.log('init commit croner');
      global.commitCroner = new Cron('*/10 * * * * *', commitTransactionjob, {
        name: 'commitTransactionJob',
        catch: (err) => {
          console.error('[commitTransactionJob Cron] Error:', err);
        }
      });
    }
    if (!global.runCroner) {
      // console.log('init run croner');
      global.runCroner = new Cron('*/10 * * * * *', runTransactionjob, {
        name: 'runTransactionJob',
        catch: (err) => {
          console.error('[runTransactionJob Cron] Error:', err);
        }
      });
    }
    if (!global.finishCroner) {
      // console.log('init finish croner');
      global.finishCroner = new Cron('*/10 * * * * *', finishTransactionJob, {
        name: 'finishTransactionJob',
        catch: (err) => {
          console.error('[finishTransactionJob Cron] Error:', err);
        }
      });
    }
    return conf;
  } catch (error) {
    console.log('-getAppConfig-', error);
    return DefaultAppClientConfig;
  }
}
