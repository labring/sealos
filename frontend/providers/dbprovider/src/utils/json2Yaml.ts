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
import { KbPgClusterType } from '@/types/cluster';

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
    ![
      DBTypeEnum.postgresql,
      DBTypeEnum.mysql,
      DBTypeEnum.notapemysql,
      DBTypeEnum.mongodb,
      DBTypeEnum.redis
    ].includes(data.dbType as DBTypeEnum)
      ? 'WipeOut'
      : data.terminationPolicy;

  function buildMySQLYaml() {
    const mysqlRes = resources['mysql'];
    if (!mysqlRes) return [];

    // Branch structure for different database types and versions
    if (
      (data.dbType === 'apecloud-mysql' || data.dbType === 'mysql') &&
      data.dbVersion.startsWith('mysql-')
    ) {
      // start with mysql- specific configuration
      return [
        {
          apiVersion: 'apps.kubeblocks.io/v1alpha1',
          kind: 'Cluster',
          metadata: {
            labels: {
              'clusterdefinition.kubeblocks.io/name': 'mysql',
              'clusterversion.kubeblocks.io/name': data.dbVersion
            },
            name: `${data.dbName}`,
            namespace: getUserNamespace()
          },
          spec: {
            affinity: {
              podAntiAffinity: 'Preferred',
              tenancy: 'SharedNode'
            },
            clusterDefinitionRef: 'mysql',
            clusterVersionRef: data.dbVersion,
            componentSpecs: Object.entries(resources).map(([key, resourceData]) => {
              return {
                componentDefRef: key,
                enabledLogs: ['error', 'slow'],
                monitor: false,
                name: key,
                noCreatePDB: false,
                replicas: resourceData.other?.replicas ?? data.replicas,
                resources: resourceData.cpuMemory,
                rsmTransformPolicy: 'ToSts',
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
                            }
                          }
                        }
                      ]
                    }
                  : {})
              };
            }),
            monitor: {},
            resources: {
              cpu: '0',
              memory: '0'
            },
            storage: {
              size: '0'
            },
            terminationPolicy
          }
        }
      ];
    } else {
      // Default configuration for all other database types and versions
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
            clusterDefinitionRef: data.dbType,
            clusterVersionRef: data.dbVersion,
            componentSpecs: Object.entries(resources).map(([key, resourceData]) => {
              return {
                componentDefRef: key,
                monitor: true,
                name: key,
                noCreatePDB: false,
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
  }

  function buildPostgresYaml() {
    const pgRes = resources['postgresql'];
    if (!pgRes) return [];

    return [
      {
        apiVersion: 'apps.kubeblocks.io/v1alpha1',
        kind: 'Cluster',
        metadata: {
          labels: {
            'kb.io/database': data.dbVersion,
            'clusterdefinition.kubeblocks.io/name': data.dbType,
            'clusterversion.kubeblocks.io/name': data.dbVersion
          },
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

    const serviceVersion = data.dbVersion.startsWith('mongodb-')
      ? data.dbVersion.replace('mongodb-', '')
      : data.dbVersion;

    return [
      {
        apiVersion: 'apps.kubeblocks.io/v1alpha1',
        kind: 'Cluster',
        metadata: {
          labels: {
            'kb.io/database': data.dbVersion,
            'app.kubernetes.io/instance': data.dbName,
            // 'app.kubernetes.io/version': serviceVersion,
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
              componentDef: 'mongodb',
              name: 'mongodb',
              replicas: mongoRes.other?.replicas ?? data.replicas,
              resources: mongoRes.cpuMemory,
              ...(mongoRes.storage > 0 && {
                serviceVersion: serviceVersion,
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
    const redisRes = resources['redis'];
    const sentinelRes = resources['redis-sentinel'] ?? {
      cpuMemory: {
        limits: { cpu: '200m', memory: '256Mi' },
        requests: { cpu: '200m', memory: '256Mi' }
      },
      storage: 20,
      other: { replicas: 3 }
    };

    if (!redisRes) return [];

    const serviceVersion = data.dbVersion.startsWith('redis-')
      ? data.dbVersion.replace('redis-', '')
      : data.dbVersion.split('-').pop() || '';

    const metaLabels = {
      'kb.io/database': data.dbVersion,
      'app.kubernetes.io/instance': data.dbName,
      'app.kubernetes.io/version': serviceVersion,
      'clusterdefinition.kubeblocks.io/name': data.dbType,
      'clusterversion.kubeblocks.io/name': data.dbVersion,
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
            serviceVersion: serviceVersion,
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
            replicas: redisRes.other?.replicas ?? data.replicas,
            resources: sentinelRes.cpuMemory,
            serviceVersion: serviceVersion,
            volumeClaimTemplates: [
              {
                name: 'data',
                spec: {
                  accessModes: ['ReadWriteOnce'],
                  resources: { requests: { storage: `2Gi` } }
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
      'kb.io/database': data.dbVersion,
      'clusterdefinition.kubeblocks.io/name': data.dbType,
      'clusterversion.kubeblocks.io/name': data.dbVersion,
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
            replicas: data.replicas,
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
            replicas: data.replicas,
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
            replicas: data.replicas,
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
    const brokerRes = resources['kafka-broker'] || {
      cpuMemory: {
        limits: { cpu: '0.5', memory: '0.5Gi' },
        requests: { cpu: '0.5', memory: '0.5Gi' }
      },
      storage: 20,
      other: { replicas: 1 }
    };
    const controllerRes = resources['controller'] || {
      cpuMemory: {
        limits: { cpu: '0.5', memory: '0.5Gi' },
        requests: { cpu: '0.5', memory: '0.5Gi' }
      },
      storage: 20,
      other: { replicas: 1 }
    };
    const exporterRes = resources['kafka-exporter'] || {
      cpuMemory: {
        limits: { cpu: '0.5', memory: '0.5Gi' },
        requests: { cpu: '0.5', memory: '0.5Gi' }
      },
      storage: 0,
      other: { replicas: 1 }
    };

    const kafkaObj = {
      apiVersion: 'apps.kubeblocks.io/v1alpha1',
      kind: 'Cluster',
      metadata: {
        labels: {
          'kb.io/database': data.dbVersion,
          'clusterdefinition.kubeblocks.io/name': data.dbType,
          'clusterversion.kubeblocks.io/name': data.dbVersion
        },
        name: data.dbName,
        namespace: getUserNamespace(),
        annotations: {
          'kubeblocks.io/extra-env': JSON.stringify({
            KB_KAFKA_ENABLE_SASL: 'false',
            KB_KAFKA_BROKER_HEAP: '-XshowSettings:vm -XX:MaxRAMPercentage=100 -Ddepth=64',
            KB_KAFKA_CONTROLLER_HEAP: '-XshowSettings:vm -XX:MaxRAMPercentage=100 -Ddepth=64',
            KB_KAFKA_PUBLIC_ACCESS: 'false'
          })
        }
      },
      spec: {
        terminationPolicy,
        componentSpecs: [
          {
            name: 'broker',
            componentDef: 'kafka-broker',
            tls: false,
            replicas: data.replicas,
            affinity: {
              podAntiAffinity: 'Preferred',
              topologyKeys: ['kubernetes.io/hostname'],
              tenancy: 'SharedNode'
            },
            tolerations: [
              {
                key: 'kb-data',
                operator: 'Equal',
                value: 'true',
                effect: 'NoSchedule'
              }
            ],
            resources: {
              limits: { ...brokerRes.cpuMemory.limits },
              requests: { ...brokerRes.cpuMemory.requests }
            },
            volumeClaimTemplates: [
              {
                name: 'data',
                spec: {
                  accessModes: ['ReadWriteOnce'],
                  resources: { requests: { storage: `${brokerRes.storage / 2}Gi` } }
                }
              },
              {
                name: 'metadata',
                spec: {
                  storageClassName: null,
                  accessModes: ['ReadWriteOnce'],
                  resources: { requests: { storage: `${brokerRes.storage / 2}Gi` } }
                }
              }
            ]
          },
          {
            name: 'controller',
            componentDefRef: 'controller',
            componentDef: 'kafka-controller',
            tls: false,
            replicas: data.replicas,
            resources: {
              limits: { ...controllerRes.cpuMemory.limits },
              requests: { ...controllerRes.cpuMemory.requests }
            },
            volumeClaimTemplates: [
              {
                name: 'metadata',
                spec: {
                  storageClassName: null,
                  accessModes: ['ReadWriteOnce'],
                  resources: { requests: { storage: `${controllerRes.storage}Gi` } }
                }
              }
            ]
          },
          {
            name: 'metrics-exp',
            componentDef: 'kafka-exporter',
            replicas: data.replicas,
            resources: {
              limits: { ...exporterRes.cpuMemory.limits },
              requests: { ...exporterRes.cpuMemory.requests }
            }
          }
        ]
      }
    };

    return [kafkaObj];
  }

  function buildMilvusYaml() {
    const milvusRes = (resources['milvus'] as any) || {
      cpuMemory: {
        limits: { cpu: '1', memory: '1Gi' },
        requests: { cpu: '200m', memory: '256Mi' }
      },
      storage: 3,
      other: { replicas: 1 }
    };

    const etcdRes = (resources['etcd'] as any) || {
      cpuMemory: {
        limits: { cpu: '1', memory: '1Gi' },
        requests: { cpu: '200m', memory: '256Mi' }
      },
      storage: 3,
      other: { replicas: 1 }
    };

    const minioRes = (resources['minio'] as any) || {
      cpuMemory: {
        limits: { cpu: '1', memory: '1Gi' },
        requests: { cpu: '200m', memory: '256Mi' }
      },
      storage: 3,
      other: { replicas: 1 }
    };

    const labels = {
      'clusterdefinition.kubeblocks.io/name': 'milvus'
    };

    const milvusObj = {
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
          tenancy: 'SharedNode'
        },
        clusterDefinitionRef: 'milvus',
        clusterVersionRef: data.dbVersion,
        terminationPolicy,
        componentSpecs: [
          {
            componentDefRef: 'milvus',
            name: 'milvus',
            disableExporter: true,
            serviceAccountName: `kb-${data.dbName}`,
            replicas: data.replicas ?? 1,
            resources: milvusRes.cpuMemory,
            volumeClaimTemplates: [
              {
                name: 'data',
                spec: {
                  accessModes: ['ReadWriteOnce'],
                  resources: { requests: { storage: `${milvusRes.storage}Gi` } }
                }
              }
            ]
          },

          {
            componentDefRef: 'etcd',
            name: 'etcd',
            disableExporter: true,
            serviceAccountName: `kb-${data.dbName}`,
            replicas: data.replicas,
            resources: etcdRes.cpuMemory,
            volumeClaimTemplates: [
              {
                name: 'data',
                spec: {
                  accessModes: ['ReadWriteOnce'],
                  resources: { requests: { storage: `${etcdRes.storage}Gi` } }
                }
              }
            ]
          },

          {
            componentDefRef: 'minio',
            name: 'minio',
            disableExporter: true,
            serviceAccountName: `kb-${data.dbName}`,
            replicas: data.replicas,
            resources: minioRes.cpuMemory,
            volumeClaimTemplates: [
              {
                name: 'data',
                spec: {
                  accessModes: ['ReadWriteOnce'],
                  resources: { requests: { storage: `${minioRes.storage}Gi` } }
                }
              }
            ]
          }
        ],
        resources: {
          cpu: '0',
          memory: '0'
        },
        storage: {
          size: '0'
        }
      }
    };

    return [milvusObj];
  }

  function createDBObject(dbType: DBType) {
    switch (dbType) {
      case DBTypeEnum.mysql:
      case DBTypeEnum.notapemysql:
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
      case DBTypeEnum.milvus:
        return buildMilvusYaml();
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
    [DBTypeEnum.notapemysql]: pgAccountTemplate,
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
          componentName: DBComponentNameMap[dbType] || [dbType],
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
          componentName: DBComponentNameMap[dbType] || [dbType]
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
    mysql: 'apecloud-mysql2mysql',
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
  dbCluster,
  dbStatefulSet
}: {
  dbDetail: DBDetailType;
  dbCluster?: KbPgClusterType;
  dbStatefulSet?: V1StatefulSet;
}) => {
  const portMapping = {
    postgresql: 5432,
    mongodb: 27017,
    'apecloud-mysql': 3306,
    mysql: 3306,
    redis: 6379,
    kafka: 9092,
    qdrant: '',
    nebula: '',
    weaviate: '',
    milvus: 19530,
    pulsar: 6650,
    clickhouse: 8123
  };
  const labelMap: Record<
    DBType,
    Record<string, Record<string, string>> & { default: Record<string, string> }
  > = {
    postgresql: {
      default: {
        'kubeblocks.io/role': 'primary'
      }
    },
    mongodb: {
      default: {
        'kubeblocks.io/role': 'primary'
      }
    },
    'apecloud-mysql': {
      default: {
        'kubeblocks.io/role': 'leader'
      }
    },
    mysql: {
      default: {
        'kubeblocks.io/role': 'primary',
        'apps.kubeblocks.io/component-name': 'mysql'
      }
    },
    redis: {
      default: {
        'kubeblocks.io/role': 'primary'
      }
    },
    kafka: {
      default: {
        'apps.kubeblocks.io/component-name': 'kafka-broker'
      }
    },
    qdrant: {
      default: {}
    },
    nebula: {
      default: {}
    },
    weaviate: {
      default: {}
    },
    milvus: {
      default: {
        'apps.kubeblocks.io/component-name': 'milvus'
      }
    },
    pulsar: {
      default: {}
    },
    clickhouse: {
      default: {}
    }
  };

  const labels =
    Object.entries(labelMap[dbDetail.dbType]).find(
      ([version]) => version === dbDetail.dbVersion
    )?.[1] ?? labelMap[dbDetail.dbType].default;

  const template = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: `${dbDetail.dbName}-export`,
      labels: {
        'app.kubernetes.io/instance': dbDetail.dbName,
        // 'app.kubernetes.io/managed-by': 'kubeblocks',
        'apps.kubeblocks.io/component-name': dbDetail.dbType,
        ...labels
      },
      ...(dbCluster && {
        ownerReferences: [
          {
            apiVersion: dbCluster?.apiVersion,
            kind: 'Cluster',
            name: dbCluster?.metadata?.name,
            uid: dbCluster?.metadata?.uid
            // blockOwnerDeletion: true,
            // controller: true
          }
        ]
      }),
      ...(dbStatefulSet && {
        ownerReferences: [
          {
            apiVersion: dbStatefulSet?.apiVersion,
            kind: 'StatefulSet',
            name: dbStatefulSet?.metadata?.name,
            uid: dbStatefulSet?.metadata?.uid
            // blockOwnerDeletion: true,
            // controller: false
          }
        ]
      })
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
        // 'app.kubernetes.io/managed-by': 'kubeblocks',
        ...labels
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
        // For displaying previous value.
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

export function json2RestoreOpsRequest(params: {
  clusterName: string;
  namespace: string;
  backupName: string;
}) {
  const { clusterName, namespace, backupName } = params;

  const template = {
    apiVersion: 'apps.kubeblocks.io/v1alpha1',
    kind: 'OpsRequest',
    metadata: {
      labels: {
        'app.kubernetes.io/instance': clusterName,
        'ops.kubeblocks.io/ops-type': 'Restore'
      },
      name: `${clusterName}-${nanoid(4)}`,
      namespace
    },
    spec: {
      clusterName,
      enqueueOnForce: false,
      preConditionDeadlineSeconds: 0,
      restore: {
        backupName,
        volumeRestorePolicy: 'Parallel'
      },
      ttlSecondsAfterSucceed: 30,
      type: 'Restore'
    }
  };

  return yaml.dump(template);
}

export const json2ParameterConfig = (
  dbName: string,
  dbType: string,
  dbVersion: string,
  parameterConfig?: {
    maxConnections?: string;
    timeZone?: string;
    lowerCaseTableNames?: string;
    isMaxConnectionsCustomized?: boolean;
    maxmemory?: string;
  },
  dynamicMaxConnections?: number
) => {
  function buildPostgresYaml() {
    // Parse PostgreSQL version to get major version (e.g., "postgresql-12.14.0" -> "12", "16.4.0" -> "16")
    const majorVersion = dbVersion.replace(/^postgresql-/, '').split('.')[0];

    const pgParams: Record<string, string> = {};

    const maxConnections = parameterConfig?.isMaxConnectionsCustomized
      ? parameterConfig?.maxConnections
      : dynamicMaxConnections?.toString();

    if (maxConnections) {
      pgParams['max_connections'] = `${maxConnections}`;
    }

    if (parameterConfig?.timeZone) {
      pgParams['timezone'] = `${parameterConfig.timeZone}`;
    }

    const template = {
      apiVersion: 'apps.kubeblocks.io/v1alpha1',
      kind: 'Configuration',
      metadata: {
        labels: {
          'app.kubernetes.io/instance': `${dbName}`,
          'app.kubernetes.io/managed-by': 'kubeblocks',
          'apps.kubeblocks.io/component-name': 'postgresql'
        },
        name: `${dbName}-postgresql`,
        namespace: getUserNamespace()
      },
      spec: {
        clusterRef: `${dbName}`,
        componentName: 'postgresql',
        configItemDetails: [
          {
            configFileParams: {
              'postgresql.conf': {
                parameters: pgParams
              }
            },
            configSpec: {
              constraintRef: 'postgresql14-cc',
              defaultMode: 292,
              keys: ['postgresql.conf'],
              name: 'postgresql-configuration',
              namespace: 'kb-system',
              templateRef: 'postgresql-configuration',
              volumeName: 'postgresql-config'
            },
            name: 'postgresql-configuration'
          },
          {
            configSpec: {
              defaultMode: 292,
              keys: ['pgbouncer.ini'],
              name: 'pgbouncer-configuration',
              namespace: 'kb-system',
              templateRef: 'pgbouncer-configuration',
              volumeName: 'pgbouncer-config'
            },
            name: 'pgbouncer-configuration'
          },
          {
            configSpec: {
              defaultMode: 292,
              name: 'postgresql-custom-metrics',
              namespace: 'kb-system',
              templateRef: `postgresql${majorVersion}-custom-metrics`,
              volumeName: 'postgresql-custom-metrics'
            },
            name: 'postgresql-custom-metrics'
          }
        ]
      }
    };

    return yaml.dump(template);
  }

  function buildMysqlYaml() {
    const mysqlParams: Record<string, string> = {};

    const maxConnections = parameterConfig?.isMaxConnectionsCustomized
      ? parameterConfig?.maxConnections
      : dynamicMaxConnections?.toString();

    if (maxConnections) {
      mysqlParams['max_connections'] = String(maxConnections);
    }

    if (parameterConfig?.timeZone) {
      mysqlParams['default-time-zone'] = String(parameterConfig.timeZone);
    }

    // Do not automatically set a value for (existing) databases.
    if (parameterConfig?.lowerCaseTableNames) {
      mysqlParams['lower_case_table_names'] = String(parameterConfig.lowerCaseTableNames);
    }

    // Check if this is MySQL 5.7.42 version
    // 临时废弃 mysql-5.7.42
    // if (dbVersion === 'mysql-5.7.42') {
    //   if (parameterConfig?.timeZone === 'UTC') {
    //     mysqlParams['default-time-zone'] = '+00:00';
    //   } else if (parameterConfig?.timeZone === 'Asia/Shanghai') {
    //     mysqlParams['default-time-zone'] = '+08:00';
    //   }

    //   const replicationItem: any = {
    //     ...(Object.keys(mysqlParams).length > 0 && {
    //       configFileParams: {
    //         'my.cnf': {
    //           parameters: mysqlParams
    //         }
    //       }
    //     }),
    //     configSpec: {
    //       constraintRef: 'oracle-mysql8.0-config-constraints',
    //       name: 'mysql-replication-config',
    //       namespace: 'kb-system',
    //       templateRef: 'oracle-mysql5.7-config-template',
    //       volumeName: 'mysql-config'
    //     },
    //     name: 'mysql-replication-config'
    //   };

    //   const template = {
    //     apiVersion: 'apps.kubeblocks.io/v1alpha1',
    //     kind: 'Configuration',
    //     metadata: {
    //       labels: {
    //         'app.kubernetes.io/instance': dbName,
    //         'app.kubernetes.io/managed-by': 'kubeblocks'
    //       },
    //       name: `${dbName}-mysql`,
    //       namespace: getUserNamespace()
    //     },
    //     spec: {
    //       clusterRef: dbName,
    //       componentName: 'mysql',
    //       configItemDetails: [
    //         replicationItem,
    //         {
    //           configSpec: {
    //             defaultMode: 292,
    //             name: 'agamotto-configuration',
    //             namespace: 'kb-system',
    //             templateRef: 'mysql-agamotto-configuration',
    //             volumeName: 'agamotto-configuration'
    //           },
    //           name: 'agamotto-configuration'
    //         }
    //       ]
    //     }
    //   };

    //   return yaml.dump(template);
    // }

    // Default MySQL 8.0 configuration for other versions
    const consensusItem = {
      ...(Object.keys(mysqlParams).length > 0 && {
        configFileParams: {
          'my.cnf': {
            parameters: mysqlParams
          }
        }
      }),
      configSpec: {
        constraintRef: 'mysql8.0-config-constraints',
        name: 'mysql-consensusset-config',
        namespace: 'kb-system',
        reRenderResourceTypes: ['vscale'],
        templateRef: 'mysql8.0-config-template',
        volumeName: 'mysql-config'
      },
      name: 'mysql-consensusset-config',
      payload: {
        'component-resource': {
          limits: {
            cpu: '500m',
            memory: '512Mi'
          },
          requests: {
            cpu: '500m',
            memory: '512Mi'
          }
        }
      }
    };

    const template = {
      apiVersion: 'apps.kubeblocks.io/v1alpha1',
      kind: 'Configuration',
      metadata: {
        labels: {
          'app.kubernetes.io/instance': dbName,
          'app.kubernetes.io/managed-by': 'kubeblocks',
          'apps.kubeblocks.io/component-name': 'mysql'
        },
        name: `${dbName}-mysql`,
        namespace: getUserNamespace()
      },
      spec: {
        clusterRef: dbName,
        componentName: 'mysql',
        configItemDetails: [
          consensusItem,
          {
            configSpec: {
              constraintRef: 'mysql-scale-vttablet-config-constraints',
              name: 'vttablet-config',
              namespace: 'kb-system',
              templateRef: 'vttablet-config-template',
              volumeName: 'mysql-scale-config'
            },
            name: 'vttablet-config'
          }
        ]
      }
    };

    return yaml.dump(template);
  }
  function buildMongodbYaml() {
    const mongoParams: Record<string, string> = {};

    const maxConnections = parameterConfig?.isMaxConnectionsCustomized
      ? parameterConfig?.maxConnections
      : dynamicMaxConnections?.toString();

    if (maxConnections) {
      mongoParams['net.maxIncomingConnections'] = maxConnections;
    }

    const template = {
      apiVersion: 'apps.kubeblocks.io/v1alpha1',
      kind: 'Configuration',
      metadata: {
        labels: {
          'app.kubernetes.io/instance': dbName,
          'app.kubernetes.io/managed-by': 'kubeblocks',
          'apps.kubeblocks.io/component-name': 'mongodb'
        },
        name: `${dbName}-mongodb`,
        namespace: getUserNamespace()
      },
      spec: {
        clusterRef: dbName,
        componentName: 'mongodb',
        configItemDetails: [
          {
            configSpec: {
              constraintRef: 'mongodb-config-constraints',
              defaultMode: 256,
              keys: ['mongodb.conf'],
              name: 'mongodb-config',
              namespace: 'kb-system',
              templateRef: 'mongodb5.0-config-template',
              volumeName: 'mongodb-config',
              ...(Object.keys(mongoParams).length > 0 && {
                parameters: mongoParams
              })
            },
            name: 'mongodb-config'
          }
        ]
      }
    };
    return yaml.dump(template);
  }
  function buildRedisYaml() {
    const redisParams: Record<string, string> = {};

    const maxConnections = parameterConfig?.isMaxConnectionsCustomized
      ? parameterConfig?.maxConnections
      : dynamicMaxConnections?.toString();

    if (maxConnections) {
      redisParams['maxclients'] = String(maxConnections);
    }

    if (parameterConfig?.maxmemory) {
      redisParams['maxmemory'] = String(parameterConfig.maxmemory);
    }

    const replicationItem = {
      ...(Object.keys(redisParams).length > 0 && {
        configFileParams: {
          'redis.conf': {
            parameters: redisParams
          }
        }
      }),
      configSpec: {
        constraintRef: 'redis7-config-constraints',
        name: 'redis-replication-config',
        namespace: 'kb-system',
        reRenderResourceTypes: ['vscale'],
        templateRef: 'redis7-config-template',
        volumeName: 'redis-config'
      },
      name: 'redis-replication-config',
      payload: {
        'component-resource': {
          limits: {
            cpu: '500m',
            memory: '512Mi'
          },
          requests: {
            cpu: '500m',
            memory: '512Mi'
          }
        }
      }
    };

    const template = {
      apiVersion: 'apps.kubeblocks.io/v1alpha1',
      kind: 'Configuration',
      metadata: {
        labels: {
          'app.kubernetes.io/instance': dbName,
          'app.kubernetes.io/managed-by': 'kubeblocks',
          'apps.kubeblocks.io/component-name': 'redis'
        },
        name: `${dbName}-redis`,
        namespace: getUserNamespace()
      },
      spec: {
        clusterRef: dbName,
        componentName: 'redis',
        configItemDetails: [
          replicationItem,
          {
            configSpec: {
              defaultMode: 292,
              name: 'redis-metrics-config',
              namespace: 'kb-system',
              templateRef: 'redis-metrics-config',
              volumeName: 'redis-metrics-config'
            },
            name: 'redis-metrics-config'
          }
        ]
      }
    };

    return yaml.dump(template);
  }
  // Support for multiple database types
  if (dbType === 'postgresql' || dbType === undefined) {
    return buildPostgresYaml();
  } else if (dbType === 'apecloud-mysql' || dbType === 'mysql') {
    return buildMysqlYaml();
  } else if (dbType === 'mongodb') {
    return buildMongodbYaml();
  } else if (dbType === 'redis') {
    return buildRedisYaml();
  }
  throw new Error(`json2ParameterConfig: unsupported dbType ${dbType}`);
};
