import { LicenseYaml } from '@/types';
import yaml from 'js-yaml';
import { getUserNamespace } from './user';

export const json2License = (licenseYaml: string) => {
  const namespace = getUserNamespace();
  const obj = yaml.load(licenseYaml) as LicenseYaml;
  const template: LicenseYaml = obj;
  return yaml.dump(template);
};
