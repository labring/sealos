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

type TUser = {
  name: string;
  authority: [];
};

type TDataBase = {
  name: string;
  user: string;
};

export const generatePgsqlTemplate = (pgsqlForm: any) => {
  let user = '';
  pgsqlForm.users.forEach((item: TUser) => {
    user += `${item.name}: [${item.authority}]\n    `;
  });
  let dataBase = '';
  pgsqlForm.dataBases.forEach((item: TDataBase) => {
    dataBase += `${item.name}: ${item.user}\n    `;
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
