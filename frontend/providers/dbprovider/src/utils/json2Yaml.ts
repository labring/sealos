import { BACKUP_LABEL_KEY, BACKUP_REMARK_LABEL_KEY } from '@/constants/backup';
import {
  CloudMigraionLabel,
  DBComponentNameMap,
  DBPreviousConfigKey,
  DBReconfigureMap,
  DBTypeEnum,
  MigrationRemark,
  crLabelKey
} from '@/constants/db';
import { StorageClassName } from '@/store/env';
import type {
  BackupItemType,
  DBComponentsName,
  DBDetailType,
  DBEditType,
  DBType
} from '@/types/db';
import { MigrateForm } from '@/types/migrate';
import { encodeToHex, formatNumber, formatTime, str2Num } from '@/utils/tools';
import dayjs from 'dayjs';
import yaml from 'js-yaml';
import { getUserNamespace } from './user';
import { V1StatefulSet } from '@kubernetes/client-node';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 5);

/**
 * Convert data for creating a database cluster to YAML configuration.
 * Used for client display, server logic handles actual creation.
 *
 * @param data Data for creating the database cluster.
 * @param backupInfo Optional backup data for database restoration.
 * @returns Generated YAML configuration.
 */
export const json2CreateCluster = (
  data: DBEditType,
  backupInfo?: BackupItemType,
  options?: {
    storageClassName?: string;
  }
) => {
  type resourcesDistributeMap = Partial<
    Record<
      DBComponentsName,
      {
        cpuMemory: {
          limits: {
            cpu: string;
            memory: string;
          };
          requests: {
            cpu: string;
            memory: string;
          };
        };
        storage: number;
        other?: Record<string, any>;
      }
    >
  >;

  function distributeResources(dbType: DBType): resourcesDistributeMap {
    const [cpu, memory] = [str2Num(Math.floor(data.cpu)), str2Num(data.memory)];

    function allocateCM(cpu: number, memory: number) {
      return {
        limits: {
          cpu: `${formatNumber(cpu)}m`,
          memory: `${formatNumber(memory)}Mi`
        },
        requests: {
          cpu: `${Math.floor(cpu * 0.1)}m`,
          memory: `${Math.floor(memory * 0.1)}Mi`
        }
      };
    }

    function getPercentResource(percent: number) {
      return allocateCM(cpu * percent, memory * percent);
    }

    switch (dbType) {
      case DBTypeEnum.postgresql:
      case DBTypeEnum.mongodb:
      case DBTypeEnum.mysql:
        return {
          [DBComponentNameMap[dbType][0]]: {
            cpuMemory: getPercentResource(1),
            storage: data.storage
          }
        };
      case DBTypeEnum.redis:
        // Please ref RedisHAConfig in  /constants/db.ts
        let rsRes = [100, 100, 0, 1];
        if (data.replicas > 1) {
          rsRes = [200, 200, 1, 3];
        }
        return {
          redis: {
            cpuMemory: getPercentResource(1),
            storage: Math.max(data.storage - 1, 1)
          },
          'redis-sentinel': {
            cpuMemory: allocateCM(rsRes[0], rsRes[1]),
            storage: rsRes[2],
            other: {
              replicas: rsRes[3]
            }
          }
        };
      case DBTypeEnum.kafka:
        const quarterResource = {
          cpuMemory: getPercentResource(0.25),
          storage: Math.max(Math.round(data.storage / DBComponentNameMap[dbType].length), 1)
        };
        return {
          'kafka-server': quarterResource,
          'kafka-broker': quarterResource,
          controller: quarterResource,
          'kafka-exporter': quarterResource
        };
      case DBTypeEnum.milvus:
        return {
          milvus: {
            cpuMemory: getPercentResource(0.4),
            storage: Math.max(Math.round(data.storage / 3), 1)
          },
          etcd: {
            cpuMemory: getPercentResource(0.3),
            storage: Math.max(Math.round(data.storage / 3), 1)
          },
          minio: {
            cpuMemory: getPercentResource(0.3),
            storage: Math.max(Math.round(data.storage / 3), 1)
          }
        };
      default:
        const resource = getPercentResource(DBComponentNameMap[dbType].length);
        return DBComponentNameMap[dbType].reduce((acc: resourcesDistributeMap, cur) => {
          acc[cur] = {
            cpuMemory: getPercentResource(DBComponentNameMap[dbType].length),
            storage: Math.max(Math.round(data.storage / DBComponentNameMap[dbType].length), 1)
          };
          return acc;
        }, {});
    }
  }

  const resources = distributeResources(data.dbType);

  const metadata = {
    finalizers: ['cluster.kubeblocks.io/finalizer'],
    labels: {
      ...data.labels,
      'clusterdefinition.kubeblocks.io/name': data.dbType,
      'clusterversion.kubeblocks.io/name': data.dbVersion,
      [crLabelKey]: data.dbName
    },
    annotations: {
      ...(backupInfo?.name
        ? {
            [BACKUP_LABEL_KEY]: JSON.stringify({
              [data.dbType === 'apecloud-mysql' ? 'mysql' : data.dbType]: {
                name: backupInfo.name,
                namespace: backupInfo.namespace,
                connectionPassword: backupInfo.connectionPassword
              }
            })
          }
        : {})
    },
    name: data.dbName
  };

  const storageClassName =
    options?.storageClassName || StorageClassName
      ? { storageClassName: options?.storageClassName || StorageClassName }
      : {};

  function createDBObject(dbType: DBType) {
    // Special circumstances process here
    let terminationPolicy = backupInfo?.name ? 'WipeOut' : 'Delete';

    switch (dbType) {
      case DBTypeEnum.postgresql:
      case DBTypeEnum.mysql:
      case DBTypeEnum.mongodb:
      case DBTypeEnum.redis:
        terminationPolicy = data.terminationPolicy;
        break;
      default:
        break;
    }

    return [
      {
        apiVersion: 'apps.kubeblocks.io/v1alpha1',
        kind: 'Cluster',
        metadata,
        spec: {
          affinity: {
            nodeLabels: {},
            podAntiAffinity: 'Preferred',
            tenancy: 'SharedNode',
            topologyKeys: ['kubernetes.io/hostname']
          },
          clusterDefinitionRef: dbType,
          clusterVersionRef: data.dbVersion,
          componentSpecs: Object.entries(resources).map(([key, resourceData]) => {
            return {
              componentDefRef: key,
              monitor: true,
              name: key,
              replicas: resourceData.other?.replicas ?? data.replicas, //For special circumstances in RedisHA
              resources: resourceData.cpuMemory,
              serviceAccountName: data.dbName,
              switchPolicy: {
                type: 'Noop'
              },
              ...(resourceData.storage > 0
                ? {
                    volumeClaimTemplates: [
                      {
                        name: 'data',
                        spec: {
                          accessModes: ['ReadWriteOnce'],
                          resources: {
                            requests: {
                              storage: `${resourceData.storage}Gi`
                            }
                          },
                          ...storageClassName
                        }
                      }
                    ]
                  }
                : {})
            };
          }),
          terminationPolicy,
          tolerations: []
        }
      }
    ];
  }

  return createDBObject(data.dbType)
    .map((item) => yaml.dump(item))
    .join('\n---\n');
};

/**
 * Generates account info, potentially linked to a cluster via ownerId.
 * Primarily server-side.
 *
 * @param data Data for account creation.
 * @param ownerId Optional owner ID for cluster association.
 * @returns Generated account info.
 */
export const json2Account = (data: DBEditType, ownerId?: string) => {
  const commonLabels = {
    [crLabelKey]: data.dbName,
    'app.kubernetes.io/instance': data.dbName,
    'app.kubernetes.io/managed-by': 'kbcli'
  };

  const commonBase = {
    apiVersion: 'v1',
    kind: 'ServiceAccount',
    metadata: {
      labels: {
        ...commonLabels
      },
      ...(ownerId && {
        ownerReferences: [
          {
            apiVersion: 'apps.kubeblocks.io/v1alpha1',
            blockOwnerDeletion: true,
            controller: true,
            kind: 'Cluster',
            uid: ownerId,
            name: data.dbName
          }
        ]
      }),
      name: data.dbName
    }
  };

  const dbRolesBase = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'Role',
    metadata: {
      labels: {
        ...commonLabels
      },
      ...(ownerId && {
        ownerReferences: [
          {
            apiVersion: 'apps.kubeblocks.io/v1alpha1',
            blockOwnerDeletion: true,
            controller: true,
            kind: 'Cluster',
            uid: ownerId,
            name: data.dbName
          }
        ]
      }),
      name: data.dbName
    }
  };

  const dbRoleBindingBase = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'RoleBinding',
    metadata: {
      labels: {
        ...commonLabels
      },
      ...(ownerId && {
        ownerReferences: [
          {
            apiVersion: 'apps.kubeblocks.io/v1alpha1',
            blockOwnerDeletion: true,
            controller: true,
            kind: 'Cluster',
            uid: ownerId,
            name: data.dbName
          }
        ]
      }),
      name: data.dbName
    },
    roleRef: {
      apiGroup: 'rbac.authorization.k8s.io',
      kind: 'Role',
      name: data.dbName
    },
    subjects: [
      {
        kind: 'ServiceAccount',
        name: data.dbName
      }
    ]
  };

  const baseRoleRules = [
    {
      apiGroups: ['*'],
      resources: ['*'],
      verbs: ['*']
    }
  ];

  const pgAccountTemplate = [
    commonBase,
    {
      ...dbRolesBase,
      rules: baseRoleRules
    },
    dbRoleBindingBase
  ];

  const map = {
    [DBTypeEnum.postgresql]: pgAccountTemplate,
    [DBTypeEnum.mysql]: pgAccountTemplate,
    [DBTypeEnum.mongodb]: pgAccountTemplate,
    [DBTypeEnum.redis]: pgAccountTemplate,
    [DBTypeEnum.kafka]: pgAccountTemplate,
    [DBTypeEnum.qdrant]: pgAccountTemplate,
    [DBTypeEnum.nebula]: pgAccountTemplate,
    [DBTypeEnum.weaviate]: pgAccountTemplate,
    [DBTypeEnum.milvus]: pgAccountTemplate,
    [DBTypeEnum.pulsar]: pgAccountTemplate,
    [DBTypeEnum.clickhouse]: pgAccountTemplate
  };
  return map[data.dbType].map((item) => yaml.dump(item)).join('\n---\n');
};

export const json2VolumeExpansion = ({ dbName, storage, dbType }: DBEditType) => {
  const template = {
    apiVersion: 'apps.kubeblocks.io/v1alpha1',
    kind: 'OpsRequest',
    metadata: {
      name: `ops-volume-expansion-${dayjs().format('YYYYMMDDHHmmss')}`,
      labels: {
        [crLabelKey]: dbName
      }
    },
    spec: {
      clusterRef: dbName,
      type: 'VolumeExpansion',
      volumeExpansion: [
        {
          componentName: DBComponentNameMap[dbType],
          volumeClaimTemplates: [
            {
              name: 'data',
              storage: `${storage}Gi`
            }
          ]
        }
      ]
    }
  };

  return yaml.dump(template);
};

export const json2Upgrade = ({ dbName, dbVersion }: DBEditType) => {
  const template = {
    apiVersion: 'apps.kubeblocks.io/v1alpha1',
    kind: 'OpsRequest',
    metadata: {
      name: `ops-upgrade-${dayjs().format('YYYYMMDDHHmmss')}`,
      labels: {
        [crLabelKey]: dbName
      }
    },
    spec: {
      clusterRef: dbName,
      type: 'Upgrade',
      upgrade: {
        clusterVersionRef: dbVersion
      }
    }
  };
  return yaml.dump(template);
};

/**
 * @deprecated
 */
export const json2StartOrStop = ({ dbName, type }: { dbName: string; type: 'Start' | 'Stop' }) => {
  const nameType = type.toLocaleLowerCase();

  const template = {
    apiVersion: 'apps.kubeblocks.io/v1alpha1',
    kind: 'OpsRequest',
    metadata: {
      name: `ops-${nameType}-${dayjs().format('YYYYMMDDHHmmss')}`,
      labels: {
        [crLabelKey]: dbName
      }
    },
    spec: {
      clusterRef: dbName,
      type
    }
  };
  return {
    yaml: yaml.dump(template),
    yamlObj: template
  };
};

/**
 * @deprecated
 */
export const json2Restart = ({ dbName, dbType }: { dbName: string; dbType: DBType }) => {
  const template = {
    apiVersion: 'apps.kubeblocks.io/v1alpha1',
    kind: 'OpsRequest',
    metadata: {
      name: `ops-restart-${dayjs().format('YYYYMMDDHHmmss')}`,
      labels: {
        [crLabelKey]: dbName
      }
    },
    spec: {
      clusterRef: dbName,
      type: 'Restart',
      restart: [
        {
          componentName: DBComponentNameMap[dbType]
        }
      ]
    }
  };
  return yaml.dump(template);
};

export const json2ManualBackup = ({
  name,
  backupPolicyName,
  backupMethod,
  remark
}: {
  backupMethod: string;
  name: string;
  backupPolicyName: string;
  remark?: string;
}) => {
  const template = {
    apiVersion: 'dataprotection.kubeblocks.io/v1alpha1',
    kind: 'Backup',
    metadata: {
      // finalizers: ['dataprotection.kubeblocks.io/finalizer'],
      labels: {
        [BACKUP_REMARK_LABEL_KEY]: encodeToHex(remark || '')
      },
      name
    },
    spec: {
      backupPolicyName,
      // backupType: 'datafile'
      backupMethod
    }
  };
  return yaml.dump(template);
};

export const limitRangeYaml = `
apiVersion: v1
kind: LimitRange
metadata:
  name: ${getUserNamespace()}
spec:
  limits:
    - default:
        cpu: 50m
        memory: 64Mi
      type: Container
`;

export const json2MigrateCR = (data: MigrateForm) => {
  const userNS = getUserNamespace();
  const time = formatTime(new Date(), 'YYYYMMDDHHmmss');
  const isMigrateAll = data.sourceDatabaseTable.includes('All');

  const templateByDB: Record<DBType, string> = {
    'apecloud-mysql': 'apecloud-mysql2mysql',
    postgresql: 'apecloud-pg2pg',
    mongodb: 'apecloud-mongo2mongo',
    redis: '',
    kafka: '',
    qdrant: '',
    nebula: '',
    weaviate: '',
    milvus: '',
    pulsar: '',
    clickhouse: ''
  };

  const template = {
    apiVersion: 'datamigration.apecloud.io/v1alpha1',
    kind: 'MigrationTask',
    metadata: {
      name: `${userNS}-${time}-${data.dbName}`,
      labels: {
        [CloudMigraionLabel]: data.dbName,
        [MigrationRemark]: data?.remark || ''
      }
    },
    spec: {
      cdc: {
        config: {
          param: {
            'extractor.server_id': 1565001796
          }
        }
      },
      initialization: {
        steps:
          data.dbType === 'postgresql'
            ? ['initStruct', 'initData']
            : ['preCheck', 'initStruct', 'initData']
      },
      sinkEndpoint: {
        address: `${data.sinkHost}:${data.sinkPort}`,
        password: data.sinkPassword,
        userName: data.sinkUser,
        ...(data.dbType === 'postgresql'
          ? {
              databaseName: data.sourceDatabase
            }
          : {})
      },
      sourceEndpoint: {
        address: `${data.sourceHost}:${data.sourcePort}`,
        password: `${data.sourcePassword}`,
        userName: `${data.sourceUsername}`,
        ...(data.dbType === 'postgresql'
          ? {
              databaseName: data.sourceDatabase
            }
          : {})
      },
      migrationObj: {
        whiteList: [
          isMigrateAll
            ? {
                isAll: true,
                schemaName: data.sourceDatabase
              }
            : {
                isAll: false,
                schemaName: data.sourceDatabase,
                tableList: data.sourceDatabaseTable.map((name) => {
                  return {
                    isAll: true,
                    tableName: name
                  };
                })
              }
        ]
      },
      taskType: data.continued ? 'initialization-and-cdc' : 'initialization',
      template: templateByDB[data.dbType]
    }
  };

  return yaml.dump(template);
};

export const json2NetworkService = ({
  dbDetail,
  dbStatefulSet
}: {
  dbDetail: DBDetailType;
  dbStatefulSet: V1StatefulSet;
}) => {
  const portMapping = {
    postgresql: 5432,
    mongodb: 27017,
    'apecloud-mysql': 3306,
    redis: 6379,
    kafka: 9092,
    qdrant: '',
    nebula: '',
    weaviate: '',
    milvus: 19530,
    pulsar: 6650,
    clickhouse: 8123
  };
  const labelMap = {
    postgresql: {
      'kubeblocks.io/role': 'primary'
    },
    mongodb: {
      'kubeblocks.io/role': 'primary'
    },
    'apecloud-mysql': {
      'kubeblocks.io/role': 'leader'
    },
    redis: {
      'kubeblocks.io/role': 'primary'
    },
    kafka: {
      'apps.kubeblocks.io/component-name': 'kafka-broker'
    },
    qdrant: {},
    nebula: {},
    weaviate: {},
    milvus: {
      'apps.kubeblocks.io/component-name': 'milvus'
    },
    pulsar: {},
    clickhouse: {}
  };

  const template = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: `${dbDetail.dbName}-export`,
      labels: {
        'app.kubernetes.io/instance': dbDetail.dbName,
        'app.kubernetes.io/managed-by': 'kubeblocks',
        'apps.kubeblocks.io/component-name': dbDetail.dbType,
        ...labelMap[dbDetail.dbType]
      },
      ownerReferences: [
        {
          apiVersion: dbStatefulSet.apiVersion,
          kind: 'StatefulSet',
          name: dbStatefulSet.metadata?.name,
          uid: dbStatefulSet.metadata?.uid,
          blockOwnerDeletion: true,
          controller: true
        }
      ]
    },
    spec: {
      ports: [
        {
          name: 'tcp',
          protocol: 'TCP',
          port: portMapping[dbDetail.dbType],
          targetPort: portMapping[dbDetail.dbType]
        }
      ],
      selector: {
        'app.kubernetes.io/instance': dbDetail.dbName,
        'app.kubernetes.io/managed-by': 'kubeblocks',
        ...labelMap[dbDetail.dbType]
      },
      type: 'NodePort'
    }
  };

  return yaml.dump(template);
};

export const json2Reconfigure = (
  dbName: string,
  dbType: DBType,
  dbUid: string,
  configParams: { path: string; newValue: string; oldValue: string }[]
) => {
  const namespace = getUserNamespace();
  const template = {
    apiVersion: 'apps.kubeblocks.io/v1alpha1',
    kind: 'OpsRequest',
    metadata: {
      finalizers: ['opsrequest.kubeblocks.io/finalizer'],
      generateName: `${dbName}-reconfiguring-`,
      generation: 2,
      labels: {
        'app.kubernetes.io/instance': dbName,
        'app.kubernetes.io/managed-by': 'kubeblocks',
        'ops.kubeblocks.io/ops-type': 'Reconfiguring',
        ...configParams.reduce((acc, param) => ({ ...acc, [param.path]: param.newValue }), {})
      },
      annotations: {
        [DBPreviousConfigKey]: JSON.stringify(
          configParams.reduce((acc, param) => ({ ...acc, [param.path]: param.oldValue }), {})
        )
      },
      name: `${dbName}-reconfiguring-${nanoid()}`,
      namespace: namespace,
      ownerReferences: [
        {
          apiVersion: 'apps.kubeblocks.io/v1alpha1',
          kind: 'Cluster',
          name: dbName,
          uid: dbUid
        }
      ]
    },
    spec: {
      clusterRef: dbName,
      reconfigure: {
        componentName: dbType === 'apecloud-mysql' ? 'mysql' : dbType,
        configurations: [
          {
            keys: [
              {
                key: DBReconfigureMap[dbType].reconfigureKey,
                parameters: configParams.map((item) => ({ key: item.path, value: item.newValue }))
              }
            ],
            name: DBReconfigureMap[dbType].reconfigureName
          }
        ]
      },
      ttlSecondsBeforeAbort: 0,
      type: 'Reconfiguring'
    }
  };

  return yaml.dump(template);
};

export const json2ResourceOps = (
  data: DBEditType,
  type: 'VerticalScaling' | 'HorizontalScaling' | 'VolumeExpansion'
) => {
  const componentName =
    data.dbType === 'apecloud-mysql' ? 'mysql' : data.dbType === 'kafka' ? 'broker' : data.dbType;

  const getOpsName = () => {
    const timeStr = dayjs().format('YYYYMMDDHHmm');
    const randomStr = nanoid(4);
    return `ops-${type.toLowerCase()}-${timeStr}-${randomStr}`;
  };

  const baseTemplate = {
    apiVersion: 'apps.kubeblocks.io/v1alpha1',
    kind: 'OpsRequest',
    metadata: {
      name: getOpsName(),
      labels: {
        [crLabelKey]: data.dbName
      }
    },
    spec: {
      clusterRef: data.dbName,
      type: type
    }
  };

  const opsConfig = {
    VerticalScaling: {
      verticalScaling: [
        {
          componentName,
          requests: {
            cpu: `${Math.floor(str2Num(data.cpu) * 0.1)}m`,
            memory: `${Math.floor(str2Num(data.memory) * 0.1)}Mi`
          },
          limits: {
            cpu: `${str2Num(Math.floor(data.cpu))}m`,
            memory: `${str2Num(data.memory)}Mi`
          }
        }
      ]
    },
    HorizontalScaling: {
      horizontalScaling: [
        {
          componentName,
          replicas: data.replicas
        }
      ]
    },
    VolumeExpansion: {
      volumeExpansion: [
        {
          componentName,
          volumeClaimTemplates: [
            {
              name: 'data',
              storage: `${data.storage}Gi`
            }
          ]
        }
      ]
    }
  };

  const template = {
    ...baseTemplate,
    spec: {
      ...baseTemplate.spec,
      ...opsConfig[type]
    }
  };

  return yaml.dump(template);
};

export const json2BasicOps = (data: {
  dbName: string;
  dbType?: DBType;
  type: 'Start' | 'Stop' | 'Restart';
}) => {
  const componentName =
    data.dbType === 'apecloud-mysql' ? 'mysql' : data.dbType === 'kafka' ? 'broker' : data.dbType;

  const template = {
    apiVersion: 'apps.kubeblocks.io/v1alpha1',
    kind: 'OpsRequest',
    metadata: {
      name: `ops-${data.type.toLowerCase()}-${dayjs().format('YYYYMMDDHHmmss')}`,
      labels: {
        [crLabelKey]: data.dbName
      }
    },
    spec: {
      clusterRef: data.dbName,
      type: data.type,
      ...(data.type === 'Restart'
        ? {
            restart: [{ componentName }]
          }
        : {})
    }
  };

  return yaml.dump(template);
};
