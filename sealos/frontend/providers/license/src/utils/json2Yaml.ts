import { LicenseFrontendKey } from '@/constants/key';
import { LicenseYaml, NotificationCR } from '@/types';
import yaml from 'js-yaml';

export const json2License = (licenseYaml: string) => {
  const obj = yaml.load(licenseYaml) as LicenseYaml;
  const template: LicenseYaml = obj;
  return {
    yamlStr: yaml.dump(template),
    yamlObj: obj
  };
};

export const json2Notification = ({
  namespace,
  name,
  desktopPopup,
  i18ns
}: {
  name: string;
  namespace: string;
  desktopPopup: boolean;
  i18ns: {
    zh: { message: string; title: string; from: string };
    en: { message: string; title: string; from: string };
  };
}) => {
  const notification: NotificationCR = {
    apiVersion: 'notification.sealos.io/v1',
    kind: 'Notification',
    metadata: {
      labels: {
        isRead: 'false',
        [LicenseFrontendKey]: name
      },
      name: name,
      namespace: namespace
    },
    spec: {
      from: i18ns.en.from,
      message: i18ns.en.message,
      timestamp: Math.floor(Date.now() / 1000),
      title: i18ns.en.title,
      desktopPopup: desktopPopup,
      i18ns: {
        zh: i18ns.zh
      }
    }
  };

  return notification;
};
