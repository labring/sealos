import yaml from 'js-yaml';
import { getUserId, getUserNamespace } from './user';

export const json2License = (token: string) => {
  const namespace = getUserNamespace();
  const userId = getUserId();
  const license_name = crypto.randomUUID();
  const decodedData = Buffer.from(token, 'base64').toString('binary');

  const template = {
    apiVersion: 'infostream.sealos.io/v1',
    kind: 'License',
    metadata: {
      name: license_name,
      namespace: namespace
    },
    spec: {
      uid: userId,
      token: decodedData
    }
  };
  console.log(template, 'license');
  return yaml.dump(template);
};
