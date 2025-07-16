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
              disableExporter: true,
              enabledLogs: ['running'],
              name: 'postgresql',
              replicas: pgRes.other?.replicas ?? data.replicas,
              resources: pgRes.cpuMemory,
              serviceAccountName: `kb-${data.dbName}`,
              switchPolicy: { type: 'Noop' },
              ...(pgRes.storage > 0 && {
                volumeClaimTemplates: [
                  {
                    name: 'data',
                    spec: {
                      accessModes: ['ReadWriteOnce'],
                      resources: { requests: { storage: `${pgRes.storage}Gi` } }
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
            'app.kubernetes.io/version': data.dbVersion.split('-').pop() || '',
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
    const redisRes = resources['redis']; // 主/从节点
    const sentinelRes = resources['redis-sentinel'] ?? {
      cpuMemory: {
        limits: { cpu: '200m', memory: '256Mi' },
        requests: { cpu: '200m', memory: '256Mi' }
      },
      storage: 20, // 默认 20 Gi
      other: { replicas: 3 }
    };

    if (!redisRes) return [];

    const metaLabels = {
      'app.kubernetes.io/instance': data.dbName,
      'app.kubernetes.io/version': data.dbVersion.split('-').pop() || '',
      'clusterdefinition.kubeblocks.io/name': 'redis',
      'clusterversion.kubeblocks.io/name': '',
      'helm.sh/chart': 'redis-cluster-0.9.0',
      ...data.labels
    };

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
          {
            componentDef: 'redis-7',
            name: 'redis',
            replicas: redisRes.other?.replicas ?? data.replicas,
            enabledLogs: ['running'],
            env: [{ name: 'CUSTOM_SENTINEL_MASTER_NAME' }],
            resources: redisRes.cpuMemory,
            serviceVersion: data.dbVersion.split('-').pop() || '',
            switchPolicy: { type: 'Noop' },
            volumeClaimTemplates: [
              {
                name: 'data',
                spec: {
                  accessModes: ['ReadWriteOnce'],
                  resources: { requests: { storage: `${redisRes.storage}Gi` } }
                }
              }
            ]
          },

          {
            componentDef: 'redis-sentinel-7',
            name: 'redis-sentinel',
            replicas: sentinelRes.other?.replicas ?? 3,
            resources: sentinelRes.cpuMemory,
            serviceVersion: data.dbVersion.split('-').pop() || '',
            volumeClaimTemplates: [
              {
                name: 'data',
                spec: {
                  accessModes: ['ReadWriteOnce'],
                  resources: { requests: { storage: `${sentinelRes.storage}Gi` } }
                }
              }
            ]
          }
        ],
        terminationPolicy: terminationPolicy,
        topology: 'replication'
      }
    };

    return [redisObj];
  }

  function buildClickhouseYaml() {
    const zkRes = resources['zookeeper'];
    if (!zkRes) return [];

    const chRes = resources['clickhouse'] || {
      cpuMemory: {
        limits: { cpu: '1', memory: '1Gi' },
        requests: { cpu: '1', memory: '1Gi' }
      },
      storage: 20,
      other: { replicas: 1 }
    };

    const keeperRes = resources['ch-keeper'] || {
      cpuMemory: {
        limits: { cpu: '1', memory: '1Gi' },
        requests: { cpu: '1', memory: '1Gi' }
      },
      storage: 20,
      other: { replicas: 1 }
    };

    const labels = {
      'clusterdefinition.kubeblocks.io/name': 'clickhouse',
      'clusterversion.kubeblocks.io/name': '',
      ...data.labels
    };

    const clickhouseObj = {
      apiVersion: 'apps.kubeblocks.io/v1alpha1',
      kind: 'Cluster',
      metadata: {
        labels,
        name: data.dbName,
        namespace: getUserNamespace()
      },
      spec: {
        affinity: {
          podAntiAffinity: 'Preferred',
          tenancy: 'SharedNode',
          topologyKeys: ['cluster']
        },
        clusterDefinitionRef: 'clickhouse',
        componentSpecs: [
          {
            componentDefRef: 'zookeeper',
            disableExporter: true,
            name: 'zookeeper',
            replicas: zkRes.other?.replicas ?? 1,
            resources: {
              limits: { ...zkRes.cpuMemory.limits },
              requests: { ...zkRes.cpuMemory.requests }
            },
            serviceAccountName: `kb-${data.dbName}`,
            volumeClaimTemplates: [
              {
                name: 'data',
                spec: {
                  accessModes: ['ReadWriteOnce'],
                  resources: { requests: { storage: `${zkRes.storage}Gi` } }
                }
              }
            ]
          },

          {
            componentDefRef: 'clickhouse',
            disableExporter: true,
            name: 'clickhouse',
            replicas: chRes.other?.replicas ?? 1,
            resources: {
              limits: { ...chRes.cpuMemory.limits },
              requests: { ...chRes.cpuMemory.requests }
            },
            serviceAccountName: `kb-${data.dbName}`,
            volumeClaimTemplates: [
              {
                name: 'data',
                spec: {
                  accessModes: ['ReadWriteOnce'],
                  resources: { requests: { storage: `${chRes.storage}Gi` } }
                }
              }
            ]
          },

          {
            componentDefRef: 'ch-keeper',
            disableExporter: true,
            name: 'ch-keeper',
            replicas: keeperRes.other?.replicas ?? 1,
            resources: keeperRes.cpuMemory,
            serviceAccountName: `kb-${data.dbName}`,
            volumeClaimTemplates: [
              {
                name: 'data',
                spec: {
                  accessModes: ['ReadWriteOnce'],
                  resources: { requests: { storage: `${keeperRes.storage}Gi` } }
                }
              }
            ]
          }
        ],
        resources: { cpu: '0', memory: '0' },
        storage: { size: '0' },
        terminationPolicy
      }
    };

    return [clickhouseObj];
  }

  function buildKafkaYaml() {
    const combineRes = (resources as any)['kafka-combine'] || {
      cpuMemory: {
        limits: { cpu: '500m', memory: '512Mi' },
        requests: { cpu: '500m', memory: '512Mi' }
      },
      storage: 0,
      other: { replicas: 1 }
    };

    const exporterRes = resources['kafka-exporter'] || {
      cpuMemory: {
        limits: { cpu: '500m', memory: '1Gi' },
        requests: { cpu: '100m', memory: '256Mi' }
      },
      storage: 0,
      other: { replicas: 1 }
    };

    const labels = {
      'app.kubernetes.io/instance': data.dbName,
      'app.kubernetes.io/version': data.dbVersion.split('-').pop() || '', // 3.3.2
      'clusterdefinition.kubeblocks.io/name': 'kafka',
      'clusterversion.kubeblocks.io/name': data.dbVersion,
      'helm.sh/chart': 'kafka-cluster-0.9.0',
      ...data.labels
    };

    const kafkaObj = {
      apiVersion: 'apps.kubeblocks.io/v1alpha1',
      kind: 'Cluster',
      metadata: {
        labels,
        name: data.dbName,
        namespace: getUserNamespace()
      },
      spec: {
        affinity: {
          podAntiAffinity: 'Preferred',
          tenancy: 'SharedNode',
          topologyKeys: ['kubernetes.io/hostname']
        },
        clusterDefinitionRef: 'kafka',
        clusterVersionRef: data.dbVersion,
        componentSpecs: [
          {
            componentDef: 'kafka-combine',
            name: 'kafka-combine',
            replicas: combineRes.other.replicas,
            env: [{ name: 'KB_BROKER_DIRECT_POD_ACCESS', value: 'true' }],
            monitor: true,
            resources: combineRes.cpuMemory,
            serviceVersion: data.dbVersion.split('-').pop() || '',
            services: [
              {
                name: 'advertised-listener',
                podService: true,
                serviceType: 'ClusterIP'
              }
            ]
          },
          {
            componentDef: 'kafka-exporter',
            name: 'kafka-exporter',
            replicas: exporterRes.other?.replicas ?? 1,
            monitor: true,
            resources: exporterRes.cpuMemory,
            serviceVersion: '1.6.0'
          }
        ],
        terminationPolicy,
        topology: 'combined_monitor'
      }
    };
    return [kafkaObj];
  }

  function createDBObject(dbType: DBType) {
    switch (dbType) {
      case DBTypeEnum.mysql:
      case 'apecloud-mysql':
        return buildMySQLYaml();
      case DBTypeEnum.postgresql:
        return buildPostgresYaml();
      case DBTypeEnum.mongodb:
        return buildMongoYaml();
      case DBTypeEnum.redis:
        return buildRedisYaml();
      case DBTypeEnum.clickhouse:
        return buildClickhouseYaml();
      case DBTypeEnum.kafka:
        return buildKafkaYaml();
      default:
        throw new Error(`json2CreateCluster: unsupported dbType ${dbType}`);
    }
  }

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
