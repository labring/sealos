import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  AppClientConfigType,
  AuthClientConfigType,
  CloudConfigType,
  CommonClientConfigType,
  DefaultAppClientConfig,
  LayoutConfigType
} from '@/types/system';
import { getCloudConfig } from '@/pages/api/platform/getCloudConfig';
import { getAuthClientConfig } from '@/pages/api/platform/getAuthConfig';
import { getLayoutConfig } from '@/pages/api/platform/getLayoutConfig';
import { getCommonClientConfig } from './getCommonConfig';
import { Cron } from 'croner';
import {
  commitTransactionjob,
  finishTransactionJob,
  runTransactionjob
} from '@/services/backend/cronjob';

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
  layoutConf: LayoutConfigType
): AppClientConfigType {
  return {
    cloud: cloudConf,
    common: commonConf,
    desktop: {
      auth: authConf,
      layout: layoutConf
    }
  };
}

export async function getAppConfig(): Promise<AppClientConfigType> {
  try {
    const cloudConf = await getCloudConfig();
    const authConf = await getAuthClientConfig();
    const commonConf = await getCommonClientConfig();
    const layoutConf = await getLayoutConfig();
    const conf = genResConfig(cloudConf, authConf, commonConf, layoutConf);
    if (!global.commitCroner) {
      // console.log('init commit croner');
      global.commitCroner = new Cron('* * * * * *', commitTransactionjob, {
        name: 'commitTransactionJob',
        catch: (err) => {
          // console.log(err);
        }
      });
    }
    if (!global.runCroner) {
      // console.log('init run croner');
      global.runCroner = new Cron('* * * * * *', runTransactionjob, {
        name: 'runTransactionJob',
        catch: (err) => {
          // console.log(err);
        }
      });
    }
    if (!global.finishCroner) {
      // console.log('init finish croner');
      global.finishCroner = new Cron('* * * * * *', finishTransactionJob, {
        name: 'finishTransactionJob',
        catch: (err) => {
          // console.log(err);
        }
      });
    }
    return conf;
  } catch (error) {
    console.log('-getAppConfig-', error);
    return DefaultAppClientConfig;
  }
}
