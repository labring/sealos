import { CRDMeta } from '../services/backend/kubernetes';

export const pgsqlMeta: CRDMeta = {
  group: 'acid.zalan.do',
  version: 'v1',
  namespace: 'default',
  plural: 'postgresqls'
};

export const pgsqlCRDTemplate: string = `
kind: "postgresql"
apiVersion: "acid.zalan.do/v1"

metadata:
  name: "acid-{{.pgsqlName}}"
  namespace: {{ .namespace }}
  labels:
    team: acid
spec:
  teamId: "acid"
  postgresql:
    version: "{{.version}}"
  numberOfInstances: {{.instance}}
  volume:
    size: {{.volumeSize}}Gi

  resources:
    requests:
      cpu: {{.limits.cpu}}m
      memory: {{.limits.memory}}Mi
    limits:
      cpu: {{.limits.cpu}}m
      memory: {{.limits.memory}}Mi
`;

export const generatePgsqlTemplate = (pgsqlForm: any) => {
  let user = '';
  pgsqlForm.users.forEach((item: any) => {
    user += `${item}: []\n\t`;
  });
  let dataBase = '';
  pgsqlForm.dataBases.forEach((item: any) => {
    dataBase += `${item.name}: ${item.user}\n\t`;
  });

  const text = `
kind: "postgresql"
apiVersion: "acid.zalan.do/v1"

metadata:
  name: "acid-${pgsqlForm.pgsqlName}"
  namespace: ${pgsqlForm.namespace}
  labels:
    team: acid

spec:
  teamId: "acid"
  postgresql:
    version: "${pgsqlForm.version}"
  numberOfInstances: ${pgsqlForm.instance}
  volume:
    size: ${pgsqlForm.volumeSize}Gi

  users:
    ${user}
  databases:
    ${dataBase}
  resources:
    requests:
      cpu: ${pgsqlForm.limits.cpu}m
      memory: ${pgsqlForm.limits.memory}Mi
    limits:
      cpu: ${pgsqlForm.limits.cpu}m
      memory: ${pgsqlForm.limits.memory}Mi
`;
  return text;
};
