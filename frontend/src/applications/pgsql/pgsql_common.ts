export type TPgsqlDetail = {
  metadata: {
    name: string;
    creationTimestamp: string;
    uid: string;
    namespace: string;
  };
  spec: {
    postgresql: {
      version: string;
    };
    volume: {
      size: string;
    };
    resources: {
      limits: { cpu: string; memory: string };
      requests: { cpu: string; memory: string };
    };
    teamId: string;
    numberOfInstances: number;
    databases: any;
    users: any;
  };
  status: {
    PostgresClusterStatus: string;
  };
};

export type TPgSqlForm = {
  pgsqlName: string;
  version: string;
  instance: string;
  volumeSize: string;
  iops: string;
  througput: string;
  users: any[];
  dataBases: { name: string; user: string }[];
  requests: {
    cpu: string;
    memory: string;
  };
  limits: {
    cpu: string;
    memory: string;
  };
  oddHost: string;
};

export enum EPgsqlStatus {
  Running = 'Running',
  Creating = 'Creating',
  Failed = 'CreateFailed',
  EmptyStatus = 'EmptyStatus'
}

export enum EPgsqlLists {
  Pending,
  Running
}

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

  const text = `\`\`\`yaml
kind: "postgresql"
apiVersion: "acid.zalan.do/v1"

metadata:
  name: "acid-${pgsqlForm.pgsqlName}"
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
\`\`\``;
  return text;
};
