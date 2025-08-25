import { LicenseType } from '@/types';
import yaml from 'js-yaml';

export const json2License = ({ token, type }: { token: string; type: LicenseType }) => {
  const license_name = crypto.randomUUID();
  const template = {
    apiVersion: 'license.sealos.io/v1',
    kind: 'License',
    metadata: {
      name: license_name,
      namespace: 'ns-admin'
    },
    spec: {
      type: type,
      token: token
    }
  };
  return yaml.dump(template);
};
