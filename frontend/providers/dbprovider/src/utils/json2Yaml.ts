import { BACKUP_LABEL_KEY, BACKUP_REMARK_LABEL_KEY } from '@/constants/backup';
import {
  CloudMigraionLabel,
  DBComponentNameMap,
  DBPreviousConfigKey,
  DBReconfigureMap,
  DBTypeEnum,
  MigrationRemark,
  RedisHAConfig,
  crLabelKey,
  defaultDBEditValue,
  sealafDeployKey
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
import { SwitchMsData } from '@/pages/api/pod/switchPodMs';
import { distributeResources } from './database';
import z from 'zod';
import { backupBaseSchema } from '@/types/schemas/backup';

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
  rawData: Partial<DBEditType> = {},
  backupInfo?: z.Infer<typeof backupBaseSchema>,
  options?: {
    storageClassName?: string;
  }
) => {
  const data: DBEditType = { ...defaultDBEditValue, ...rawData };
  const resources = distributeResources(data);

  // Remove sealaf-app label for restored databases to allow normal deletion
  const filteredLabels = { ...data.labels };
  if (backupInfo?.name && filteredLabels[sealafDeployKey]) {
    delete filteredLabels[sealafDeployKey];
  }

  const metadata = {
    // finalizers: ['cluster.kubeblocks.io/finalizer'],
    labels: {
      ...filteredLabels,
      'clusterdefinition.kubeblocks.io/name': data.dbType,
      'clusterversion.kubeblocks.io/name': data.dbVersion
      // [crLabelKey]: data.dbName
    },

    name: data.dbName,
    namespace: getUserNamespace()
  };

  const storageClassName =
    options?.storageClassName || StorageClassName
      ? { storageClassName: options?.storageClassName || StorageClassName }
      : {};

  /* ---------------------------------------------------------------------- */
  /* 1. 通用元数据 helpers                                                   */
  /* ---------------------------------------------------------------------- */
  const baseLabels = {
    ...data.labels,
    'clusterdefinition.kubeblocks.io/name': data.dbType,
    'clusterversion.kubeblocks.io/name': data.dbVersion
  };

  const terminationPolicy =
    backupInfo?.name &&
    ![DBTypeEnum.postgresql, DBTypeEnum.mysql, DBTypeEnum.mongodb, DBTypeEnum.redis].includes(
      data.dbType as DBTypeEnum
    )
      ? 'WipeOut'
      : data.terminationPolicy;

  function buildMySQLYaml() {
    const mysqlRes = resources['mysql'];
    if (!mysqlRes) return [];

    return [
      {
        apiVersion: 'apps.kubeblocks.io/v1alpha1',
        kind: 'Cluster',
        metadata: {
          labels: baseLabels,
          name: data.dbName,
          namespace: getUserNamespace()
        },
        spec: {
          affinity: {
            podAntiAffinity: 'Preferred',
            tenancy: 'SharedNode'
          },
          clusterDefinitionRef: data.dbType, // apecloud-mysql
          clusterVersionRef: data.dbVersion, // ac-mysql-8.0.30
          componentSpecs: [
            {
              componentDefRef: 'mysql',
              disableExporter: true,
              enabledLogs: ['auditlog', 'error', 'general', 'slow'],
              name: 'mysql',
              replicas: mysqlRes.other?.replicas ?? data.replicas,
              resources: mysqlRes.cpuMemory,
              serviceAccountName: `kb-${data.dbName}`,
              ...(mysqlRes.storage > 0 && {
                volumeClaimTemplates: [
                  {
                    name: 'data',
                    spec: {
                      accessModes: ['ReadWriteOnce'],
                      resources: { requests: { storage: `${mysqlRes.storage}Gi` } }
                    }
                  }
                ]
              })
            }
          ],
          resources: { cpu: '0', memory: '0' },
          storage: { size: '0' },
          terminationPolicy
        }
      }
    ];
  }

  function buildPostgresYaml() {
    const pgRes = resources['postgresql'];
    if (!pgRes) return [];

    return [
      {
        apiVersion: 'apps.kubeblocks.io/v1alpha1',
        kind: 'Cluster',
        metadata: {
          labels: baseLabels,
          name: data.dbName,
          namespace: getUserNamespace()
        },
        spec: {
          affinity: {
            podAntiAffinity: 'Preferred',
            tenancy: 'SharedNode'
          },
          clusterDefinitionRef: DBTypeEnum.postgresql,
          clusterVersionRef: data.dbVersion,
          componentSpecs: [
            {
              componentDefRef: 'postgresql',
              name: 'postgresql',
              replicas: pgRes.other?.replicas ?? data.replicas,
              resources: pgRes.cpuMemory,
              serviceAccountName: `kb-${data.dbName}`,
              enabledLogs: ['running'],
              ...(pgRes.storage > 0 && {
                volumeClaimTemplates: [
                  {
                    name: 'data',
                    spec: {
                      accessModes: ['ReadWriteOnce'],
                      resources: { requests: { storage: `${pgRes.storage}Gi` } },
                      ...storageClassName
                    }
                  }
                ]
              })
            }
          ],
          resources: { cpu: '0', memory: '0' },
          storage: { size: '0' },
          terminationPolicy
        }
      }
    ];
  }

  function buildMongoYaml() {
    const mongoRes = resources['mongodb'];
    if (!mongoRes) return [];

    return [
      {
        apiVersion: 'apps.kubeblocks.io/v1alpha1',
        kind: 'Cluster',
        metadata: {
          labels: {
            'app.kubernetes.io/instance': data.dbName,
            'app.kubernetes.io/version': data.dbVersion,
            'helm.sh/chart': 'mongodb-cluster-0.9.1'
          },
          name: data.dbName,
          namespace: getUserNamespace()
        },
        spec: {
          affinity: {
            podAntiAffinity: 'Preferred',
            tenancy: 'SharedNode',
            topologyKeys: ['kubernetes.io/hostname']
          },
          componentSpecs: [
            {
              componentDefRef: 'mongodb',
              name: 'mongodb',
              replicas: mongoRes.other?.replicas ?? data.replicas,
              resources: mongoRes.cpuMemory,
              ...(mongoRes.storage > 0 && {
                serviceVersion: '8.0.4',
                volumeClaimTemplates: [
                  {
                    name: 'data',
                    spec: {
                      accessModes: ['ReadWriteOnce'],
                      resources: { requests: { storage: `${mongoRes.storage}Gi` } }
                    }
                  }
                ]
              })
            }
          ],
          terminationPolicy
        }
      }
    ];
  }

  function buildRedisYaml() {
    /* 1️⃣ 主/从和 Sentinel 两套资源 ----------------------------------------- */
    const redisRes = resources['redis']; // 主/从节点
    const sentinelRes = resources['redis-sentinel'] ?? { // 如果 distributeResources 专门划分了 sentinel
      cpuMemory: {
        limits: { cpu: '200m', memory: '256Mi' },
        requests: { cpu: '200m', memory: '256Mi' }
      },
      storage: 20, // 默认 20 Gi
      other: { replicas: 3 }
    };

    if (!redisRes) return []; // 没有主/从资源就不生成

    /* 2️⃣ 通用元数据 ------------------------------------------------------- */
    const metaLabels = {
      'app.kubernetes.io/instance': data.dbName,
      'app.kubernetes.io/version': data.dbVersion, // 7.2.7
      'clusterdefinition.kubeblocks.io/name': 'redis',
      'clusterversion.kubeblocks.io/name': '', // 与模板保持一致
      'helm.sh/chart': 'redis-cluster-0.9.0',
      ...data.labels // 允许自定义覆写
    };

    /* 3️⃣ YAML 对象 -------------------------------------------------------- */
    const redisObj = {
      apiVersion: 'apps.kubeblocks.io/v1alpha1',
      kind: 'Cluster',
      metadata: {
        labels: metaLabels,
        name: data.dbName,
        namespace: getUserNamespace()
      },
      spec: {
        affinity: {
          podAntiAffinity: 'Preferred',
          tenancy: 'SharedNode',
          topologyKeys: ['kubernetes.io/hostname']
        },
        clusterDefinitionRef: 'redis',
        componentSpecs: [
          /* 主/从 redis 组件 ------------------------------------------------ */
          {
            componentDef: 'redis-7', // 注意：是 componentDef 不是 componentDefRef
            name: 'redis',
            replicas: redisRes.other?.replicas ?? data.replicas, // 2
            enabledLogs: ['running'],
            env: [{ name: 'CUSTOM_SENTINEL_MASTER_NAME', value: data.dbName }],
            resources: redisRes.cpuMemory,
            serviceVersion: data.dbVersion, // 7.2.7
            switchPolicy: { type: 'Noop' },
            volumeClaimTemplates: [
              {
                name: 'data',
                spec: {
                  accessModes: ['ReadWriteOnce'],
                  resources: { requests: { storage: `${redisRes.storage}Gi` } },
                  ...storageClassName
                }
              }
            ]
          },

          /* Sentinel 组件 --------------------------------------------------- */
          {
            componentDef: 'redis-sentinel-7',
            name: 'redis-sentinel',
            replicas: sentinelRes.other?.replicas ?? 3,
            resources: sentinelRes.cpuMemory,
            serviceVersion: data.dbVersion,
            volumeClaimTemplates: [
              {
                name: 'data',
                spec: {
                  accessModes: ['ReadWriteOnce'],
                  resources: { requests: { storage: `${sentinelRes.storage}Gi` } },
                  ...storageClassName
                }
              }
            ]
          }
        ],
        terminationPolicy: terminationPolicy, // Delete / WipeOut
        topology: 'replication' // 按模板保留
      }
    };

    return [redisObj];
  }

  /* ---------------------------------------------------------------------- */
  /* 3. 总路由：根据 dbType 选择生成函数                                     */
  /* ---------------------------------------------------------------------- */
  function createDBObject(dbType: DBType) {
    switch (dbType) {
      case DBTypeEnum.mysql:
      case 'apecloud-mysql': // 若枚举值不是字符串可再加一层映射
        return buildMySQLYaml();
      case DBTypeEnum.postgresql:
        return buildPostgresYaml();
      case DBTypeEnum.mongodb:
        return buildMongoYaml();
      case DBTypeEnum.redis:
        return buildRedisYaml();
      default:
        throw new Error(`json2CreateCluster: unsupported dbType ${dbType}`);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* 4. 把对象数组 → YAML 字符串                                             */
  /* ---------------------------------------------------------------------- */
  return createDBObject(data.dbType)
    .map((obj) => yaml.dump(obj))
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
export const json2Account = (rawData: Partial<DBEditType> = {}, ownerId?: string) => {
  const data: DBEditType = { ...defaultDBEditValue, ...rawData };

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

  const stepResources = {
    limits: {
      cpu: '2000m',
      memory: '4Gi'
    },
    requests: {
      cpu: '500m',
      memory: '512Mi'
    }
  };

  const template = {
    apiVersion: 'datamigration.apecloud.io/v1alpha1',
    kind: 'MigrationTask',
    metadata: {
      name: `${data.dbName}-migrate-${nanoid()}`,
      labels: {
        [CloudMigraionLabel]: data.dbName,
        [MigrationRemark]: data?.remark || ''
      },
      namespace: userNS
    },
    spec: {
      cdc: {
        config: {
          metrics: {},
          param: {
            'extractor.server_id': crypto.getRandomValues(new Uint32Array(1))[0]
          },
          persistentVolumeClaimName: '',
          resource: {}
        }
      },
      globalResources: {},
      initialization: {
        config: {
          initData: {
            metrics: {},
            persistentVolumeClaimName: '',
            resource: stepResources
          },
          initStruct: {
            metrics: {},
            persistentVolumeClaimName: '',
            resource: stepResources
          },
          preCheck: {
            metrics: {},
            persistentVolumeClaimName: '',
            resource: stepResources
          }
        },
        steps: ['preCheck', 'initStruct', 'initData']
      },
      migrationObj: {
        whiteList: [
          {
            isAll: isMigrateAll,
            schemaMappingName: '',
            schemaName: data.dbType === DBTypeEnum.postgresql ? 'public' : data.sourceDatabase,
            ...(!isMigrateAll
              ? {
                  tableList: data.sourceDatabaseTable.map((name) => ({
                    isAll: true,
                    tableMappingName: '',
                    tableName: name
                  }))
                }
              : {})
          }
        ]
      },
      sinkEndpoint: {
        address: `${data.sinkHost}:${data.sinkPort}`,
        databaseName: data.dbType === DBTypeEnum.mongodb ? 'admin' : data.sourceDatabase,
        password: data.sinkPassword,
        secret: {
          name: ''
        },
        userName: data.sinkUser
      },
      sourceEndpoint: {
        address: `${data.sourceHost}:${data.sourcePort}`,
        databaseName: data.dbType === DBTypeEnum.mongodb ? 'admin' : data.sourceDatabase,
        password: data.sourcePassword,
        secret: {
          name: ''
        },
        userName: data.sourceUsername
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

export function json2SwitchMsNode(data: SwitchMsData) {
  const template = {
    apiVersion: 'apps.kubeblocks.io/v1alpha1',
    kind: 'OpsRequest',
    metadata: {
      labels: {
        'app.kubernetes.io/instance': data.dbName,
        'app.kubernetes.io/managed-by': 'kubeblocks',
        'ops.kubeblocks.io/ops-type': 'Switchover'
      },
      name: `${data.dbName}-switchover-${nanoid()}`,
      namespace: data.namespace,
      ownerReferences: [
        {
          apiVersion: 'apps.kubeblocks.io/v1alpha1',
          kind: 'Cluster',
          name: data.dbName,
          uid: data.uid
        }
      ]
    },
    spec: {
      clusterRef: data.dbName,
      switchover: [
        {
          componentName: data.componentName,
          instanceName: data.podName
        }
      ],
      ttlSecondsBeforeAbort: 0,
      type: 'Switchover'
    }
  };

  return yaml.dump(template);
}
