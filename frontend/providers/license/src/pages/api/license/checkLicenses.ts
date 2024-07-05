import { K8sApiDefault, createYaml } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { LicenseCR } from '@/types';
import { decodeJWT } from '@/utils/crypto';
import { json2Notification } from '@/utils/json2Yaml';
import { formatTimeToDay } from '@/utils/tools';
import * as k8s from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';

const createLicenseNotification = (licenses: LicenseCR[], timeUntilExpiration: number) => {
  if (licenses.length === 0) {
    return json2Notification({
      namespace: 'sealos',
      name: `license-notification-${Date.now()}`,
      desktopPopup: true,
      i18ns: {
        zh: {
          from: 'License',
          title: '无有效许可证',
          message: '未找到有效许可证。请购买许可证。'
        },
        en: {
          from: 'License',
          title: 'No Active License',
          message: 'No active licenses found. Please purchase a license.'
        }
      }
    });
  }

  const daysUntilExpiration = Math.ceil(timeUntilExpiration / (24 * 60 * 60));
  if (daysUntilExpiration <= 30) {
    return json2Notification({
      namespace: 'sealos',
      name: `license-notification-${Date.now()}`,
      desktopPopup: true,
      i18ns: {
        zh: {
          from: 'License',
          title: '许可证即将过期',
          message: `您的许可证将在 ${daysUntilExpiration} 天后过期。请考虑续期。`
        },
        en: {
          from: 'License',
          title: 'License Expiring Soon',
          message: `Your license will expire in ${daysUntilExpiration} days. Please consider renewing.`
        }
      }
    });
  }

  return null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    const defaultKc = K8sApiDefault();

    const response = (await defaultKc
      .makeApiClient(k8s.CustomObjectsApi)
      .listClusterCustomObject('license.sealos.io', 'v1', 'licenses')) as {
      body: {
        items: LicenseCR[];
      };
    };
    const licenses = response.body.items.filter((item) => item.status.phase === 'Active');

    if (licenses.length === 0) {
      const noLicenseNotification = createLicenseNotification(licenses, 0);
      noLicenseNotification && (await createYaml(defaultKc, [noLicenseNotification]));
      return jsonRes(res, {
        data: {
          message: 'No licenses found'
        }
      });
    }

    const latestLicense = licenses.reduce((latest, current) => {
      const latestExp = decodeJWT(latest.spec.token)?.exp || 0;
      const currentExp = decodeJWT(current.spec.token)?.exp || 0;
      return currentExp > latestExp ? current : latest;
    });

    const maxExpTime = decodeJWT(latestLicense.spec.token)?.exp;
    if (!maxExpTime) {
      throw new Error('Failed to decode expiration time from latest license');
    }

    const now = Math.floor(Date.now() / 1000); // current time in seconds
    const timeUntilExpiration = maxExpTime - now; // time until expiration in seconds
    const isExpired = timeUntilExpiration <= 0;

    const notification = createLicenseNotification(licenses, timeUntilExpiration);
    notification && (await createYaml(defaultKc, [notification]));

    jsonRes(res, {
      data: {
        latestLicense: {
          name: latestLicense.metadata.name,
          namespace: latestLicense.metadata.namespace,
          expirationTime: new Date(maxExpTime * 1000).toString(),
          timeUntilExpiration: formatTimeToDay(timeUntilExpiration),
          isExpired: isExpired
        },
        totalActiveLicenses: licenses.length
      }
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
