import yaml from 'js-yaml';
import { getUserId } from './user';

export const json2License = (token: string) => {
  const userId = getUserId();
  const template = {
    apiVersion: 'infostream.sealos.io/v1',
    kind: 'License',
    metadata: {
      name: 'license',
      namespace: 'ns-admin'
    },
    spec: {
      uid: userId,
      token: token
    }
  };

  return yaml.dump(template);
};
