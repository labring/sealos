import yaml from 'js-yaml';

export const json2License = (token: string) => {
  const license_name = crypto.randomUUID();
  const template = {
    apiVersion: 'infostream.sealos.io/v1',
    kind: 'License',
    metadata: {
      name: license_name,
      namespace: ' ns-admin'
    },
    spec: {
      token: token
    }
  };
  return yaml.dump(template);
};
