import { BACKUP_LABEL_KEY, BACKUP_REMARK_LABEL_KEY } from '@/constants/backup';
import {
  CloudMigraionLabel,
  DBComponentNameMap,
  DBTypeEnum,
  MigrationRemark,
  RedisHAConfig,
  crLabelKey
} from '@/constants/db';
import { StorageClassName } from '@/store/env';
import type { BackupItemType, DBDetailType, DBEditType, DBType } from '@/types/db';
import { DumpForm, MigrateForm } from '@/types/migrate';
import { formatTime, str2Num } from '@/utils/tools';
import dayjs from 'dayjs';
import yaml from 'js-yaml';
import { getUserNamespace } from './user';
import { V1StatefulSet } from '@kubernetes/client-node';

export const json2CreateCluster = (data: DBEditType, backupInfo?: BackupItemType) => {
  const userNS = getUserNamespace();
  const resources = {
    limits: {
      cpu: `${str2Num(Math.floor(data.cpu))}m`,
      memory: `${str2Num(data.memory)}Mi`
    },
    requests: {
      cpu: `${Math.floor(str2Num(data.cpu) * 0.1)}m`,
      memory: `${Math.floor(str2Num(data.memory) * 0.1)}Mi`
    }
  };
  const terminationPolicy = backupInfo?.name ? 'WipeOut' : 'Delete';
  const metadata = {
    finalizers: ['cluster.kubeblocks.io/finalizer'],
    labels: {
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
                namespace: userNS,
                connectionPassword: backupInfo.connectionPassword
              }
            })
          }
        : {})
    },
    name: data.dbName
  };

  const storageClassName = StorageClassName ? { storageClassName: StorageClassName } : {};

  const redisHA = RedisHAConfig(data.replicas > 1);

  const map = {
    [DBTypeEnum.postgresql]: [
      {
        apiVersion: 'apps.kubeblocks.io/v1alpha1',
        kind: 'Cluster',
        metadata,
        spec: {
          affinity: {
            nodeLabels: {},
            podAntiAffinity: 'Preferred',
            tenancy: 'SharedNode',
            topologyKeys: []
          },
          clusterDefinitionRef: 'postgresql',
          clusterVersionRef: data.dbVersion,
          componentSpecs: [
            {
              componentDefRef: 'postgresql',
              monitor: true,
              name: 'postgresql',
              replicas: data.replicas,
              resources,
              serviceAccountName: data.dbName,
              switchPolicy: {
                type: 'Noop'
              },
              volumeClaimTemplates: [
                {
                  name: 'data',
                  spec: {
                    accessModes: ['ReadWriteOnce'],
                    resources: {
                      requests: {
                        storage: `${data.storage}Gi`
                      }
                    },
                    ...storageClassName
                  }
                }
              ]
            }
          ],
          terminationPolicy,
          tolerations: []
        }
      }
    ],
    [DBTypeEnum.mysql]: [
      {
        apiVersion: 'apps.kubeblocks.io/v1alpha1',
        kind: 'Cluster',
        metadata,
        spec: {
          affinity: {
            nodeLabels: {},
            podAntiAffinity: 'Required',
            tenancy: 'SharedNode',
            topologyKeys: ['kubernetes.io/hostname']
          },
          clusterDefinitionRef: 'apecloud-mysql',
          clusterVersionRef: data.dbVersion,
          componentSpecs: [
            {
              componentDefRef: 'mysql',
              monitor: true,
              name: 'mysql',
              replicas: data.replicas,
              resources,
              serviceAccountName: data.dbName,
              volumeClaimTemplates: [
                {
                  name: 'data',
                  spec: {
                    accessModes: ['ReadWriteOnce'],
                    resources: {
                      requests: {
                        storage: `${data.storage}Gi`
                      }
                    },
                    ...storageClassName
                  }
                }
              ]
            }
          ],
          terminationPolicy,
          tolerations: []
        }
      }
    ],
    [DBTypeEnum.mongodb]: [
      {
        apiVersion: 'apps.kubeblocks.io/v1alpha1',
        kind: 'Cluster',
        metadata: {
          ...metadata,
          generation: 1
        },
        spec: {
          affinity: {
            nodeLabels: {},
            podAntiAffinity: 'Preferred',
            tenancy: 'SharedNode',
            topologyKeys: []
          },
          clusterDefinitionRef: 'mongodb',
          clusterVersionRef: data.dbVersion,
          componentSpecs: [
            {
              componentDefRef: 'mongodb',
              monitor: true,
              name: 'mongodb',
              replicas: data.replicas,
              resources,
              serviceAccountName: data.dbName,
              volumeClaimTemplates: [
                {
                  name: 'data',
                  spec: {
                    accessModes: ['ReadWriteOnce'],
                    resources: {
                      requests: {
                        storage: `${data.storage}Gi`
                      }
                    },
                    ...storageClassName
                  }
                }
              ]
            }
          ],
          terminationPolicy,
          tolerations: []
        }
      }
    ],
    [DBTypeEnum.redis]: [
      {
        apiVersion: 'apps.kubeblocks.io/v1alpha1',
        kind: 'Cluster',
        metadata,
        spec: {
          affinity: {
            nodeLabels: {},
            podAntiAffinity: 'Preferred',
            tenancy: 'SharedNode',
            topologyKeys: []
          },
          clusterDefinitionRef: 'redis',
          clusterVersionRef: data.dbVersion,
          componentSpecs: [
            {
              componentDefRef: 'redis',
              monitor: true,
              name: 'redis',
              replicas: data.replicas,
              resources,
              serviceAccountName: data.dbName,
              switchPolicy: {
                type: 'Noop'
              },
              volumeClaimTemplates: [
                {
                  name: 'data',
                  spec: {
                    accessModes: ['ReadWriteOnce'],
                    resources: {
                      requests: {
                        storage: `${data.storage}Gi`
                      }
                    },
                    ...storageClassName
                  }
                }
              ]
            },
            {
              componentDefRef: 'redis-sentinel',
              monitor: true,
              name: 'redis-sentinel',
              replicas: redisHA.replicas,
              resources: {
                limits: {
                  cpu: `${redisHA.cpu}m`,
                  memory: `${redisHA.memory}Mi`
                },
                requests: {
                  cpu: `${redisHA.cpu}m`,
                  memory: `${redisHA.memory}Mi`
                }
              },
              serviceAccountName: data.dbName,
              ...(redisHA.storage > 0
                ? {
                    volumeClaimTemplates: [
                      {
                        name: 'data',
                        spec: {
                          accessModes: ['ReadWriteOnce'],
                          resources: {
                            requests: {
                              storage: `${redisHA.storage}Gi`
                            }
                          },
                          ...storageClassName
                        }
                      }
                    ]
                  }
                : {})
            }
          ],
          terminationPolicy,
          tolerations: []
        }
      }
    ],
    [DBTypeEnum.kafka]: [
      {
        apiVersion: 'apps.kubeblocks.io/v1alpha1',
        kind: 'Cluster',
        metadata,
        spec: {
          affinity: {
            nodeLabels: {},
            podAntiAffinity: 'Preferred',
            tenancy: 'SharedNode',
            topologyKeys: []
          },
          clusterDefinitionRef: 'kafka',
          clusterVersionRef: data.dbVersion,
          componentSpecs: [
            {
              componentDefRef: 'kafka-server',
              monitor: true,
              name: 'kafka-server',
              noCreatePDB: false,
              replicas: data.replicas,
              resources,
              serviceAccountName: data.dbName,
              volumeClaimTemplates: [
                {
                  name: 'data',
                  spec: {
                    accessModes: ['ReadWriteOnce'],
                    resources: {
                      requests: {
                        storage: `${data.storage}Gi`
                      }
                    }
                  }
                }
              ]
            },
            {
              componentDefRef: 'kafka-broker',
              monitor: true,
              name: 'kafka-broker',
              noCreatePDB: false,
              replicas: data.replicas,
              resources,
              serviceAccountName: data.dbName,
              volumeClaimTemplates: [
                {
                  name: 'data',
                  spec: {
                    accessModes: ['ReadWriteOnce'],
                    resources: {
                      requests: {
                        storage: `${data.storage}Gi`
                      }
                    }
                  }
                }
              ]
            },
            {
              componentDefRef: 'controller',
              monitor: true,
              name: 'controller',
              noCreatePDB: false,
              replicas: data.replicas,
              resources,
              serviceAccountName: data.dbName,
              volumeClaimTemplates: [
                {
                  name: 'data',
                  spec: {
                    accessModes: ['ReadWriteOnce'],
                    resources: {
                      requests: {
                        storage: `${data.storage}Gi`
                      }
                    }
                  }
                }
              ]
            },
            {
              componentDefRef: 'kafka-exporter',
              monitor: true,
              name: 'kafka-exporter',
              noCreatePDB: false,
              replicas: data.replicas,
              resources,
              serviceAccountName: data.dbName,
              volumeClaimTemplates: [
                {
                  name: 'data',
                  spec: {
                    accessModes: ['ReadWriteOnce'],
                    resources: {
                      requests: {
                        storage: `${data.storage}Gi`
                      }
                    }
                  }
                }
              ]
            }
          ],
          terminationPolicy,
          tolerations: []
        }
      }
    ],
    [DBTypeEnum.qdrant]: [
      {
        apiVersion: 'apps.kubeblocks.io/v1alpha1',
        kind: 'Cluster',
        metadata,
        spec: {
          affinity: {
            nodeLabels: {},
            podAntiAffinity: 'Preferred',
            tenancy: 'SharedNode',
            topologyKeys: []
          },
          clusterDefinitionRef: 'qdrant',
          clusterVersionRef: data.dbVersion,
          componentSpecs: [
            {
              componentDefRef: 'qdrant',
              monitor: true,
              name: 'qdrant',
              replicas: data.replicas,
              resources,
              serviceAccountName: data.dbName,
              volumeClaimTemplates: [
                {
                  name: 'data',
                  spec: {
                    accessModes: ['ReadWriteOnce'],
                    resources: {
                      requests: {
                        storage: `${data.storage}Gi`
                      }
                    }
                  }
                }
              ]
            }
          ],
          terminationPolicy,
          tolerations: []
        }
      }
    ],
    [DBTypeEnum.nebula]: [
      {
        apiVersion: 'apps.kubeblocks.io/v1alpha1',
        kind: 'Cluster',
        metadata,
        spec: {
          affinity: {
            nodeLabels: {},
            podAntiAffinity: 'Preferred',
            tenancy: 'SharedNode',
            topologyKeys: []
          },
          clusterDefinitionRef: 'nebula',
          clusterVersionRef: data.dbVersion,
          componentSpecs: [
            {
              componentDefRef: 'nebula-console',
              monitor: true,
              name: 'nebula-console',
              replicas: data.replicas,
              resources,
              serviceAccountName: data.dbName,
              volumeClaimTemplates: [
                {
                  name: 'data',
                  spec: {
                    accessModes: ['ReadWriteOnce'],
                    resources: {
                      requests: {
                        storage: `${data.storage}Gi`
                      }
                    }
                  }
                }
              ]
            },
            {
              componentDefRef: 'nebula-graphd',
              monitor: true,
              name: 'nebula-graphd',
              replicas: data.replicas,
              resources,
              serviceAccountName: data.dbName,
              volumeClaimTemplates: [
                {
                  name: 'data',
                  spec: {
                    accessModes: ['ReadWriteOnce'],
                    resources: {
                      requests: {
                        storage: `${data.storage}Gi`
                      }
                    }
                  }
                }
              ]
            },
            {
              componentDefRef: 'nebula-metad',
              monitor: true,
              name: 'nebula-metad',
              replicas: data.replicas,
              resources,
              serviceAccountName: data.dbName,
              volumeClaimTemplates: [
                {
                  name: 'data',
                  spec: {
                    accessModes: ['ReadWriteOnce'],
                    resources: {
                      requests: {
                        storage: `${data.storage}Gi`
                      }
                    }
                  }
                }
              ]
            },
            {
              componentDefRef: 'nebula-storaged',
              monitor: true,
              name: 'nebula-storaged',
              replicas: data.replicas,
              resources,
              serviceAccountName: data.dbName,
              volumeClaimTemplates: [
                {
                  name: 'data',
                  spec: {
                    accessModes: ['ReadWriteOnce'],
                    resources: {
                      requests: {
                        storage: `${data.storage}Gi`
                      }
                    }
                  }
                }
              ]
            }
          ],
          terminationPolicy,
          tolerations: []
        }
      }
    ],
    [DBTypeEnum.weaviate]: [
      {
        apiVersion: 'apps.kubeblocks.io/v1alpha1',
        kind: 'Cluster',
        metadata,
        spec: {
          affinity: {
            nodeLabels: {},
            podAntiAffinity: 'Preferred',
            tenancy: 'SharedNode',
            topologyKeys: []
          },
          clusterDefinitionRef: 'weaviate',
          clusterVersionRef: data.dbVersion,
          componentSpecs: [
            {
              componentDefRef: 'weaviate',
              monitor: true,
              name: 'weaviate',
              replicas: data.replicas,
              resources,
              serviceAccountName: data.dbName,
              volumeClaimTemplates: [
                {
                  name: 'data',
                  spec: {
                    accessModes: ['ReadWriteOnce'],
                    resources: {
                      requests: {
                        storage: `${data.storage}Gi`
                      }
                    }
                  }
                }
              ]
            }
          ],
          terminationPolicy,
          tolerations: []
        }
      }
    ],
    [DBTypeEnum.milvus]: [
      {
        apiVersion: 'apps.kubeblocks.io/v1alpha1',
        kind: 'Cluster',
        metadata,
        spec: {
          affinity: {
            podAntiAffinity: 'Preferred',
            tenancy: 'SharedNode'
          },
          clusterDefinitionRef: 'milvus',
          clusterVersionRef: data.dbVersion,
          componentSpecs: [
            {
              componentDefRef: 'milvus',
              monitor: false,
              name: 'milvus',
              noCreatePDB: false,
              replicas: data.replicas,
              resources,
              rsmTransformPolicy: 'ToSts',
              serviceAccountName: data.dbName,
              volumeClaimTemplates: [
                {
                  name: 'data',
                  spec: {
                    accessModes: ['ReadWriteOnce'],
                    resources: {
                      requests: {
                        storage: `${data.storage}Gi`
                      }
                    }
                  }
                }
              ]
            },
            {
              componentDefRef: 'etcd',
              monitor: false,
              name: 'etcd',
              noCreatePDB: false,
              replicas: data.replicas,
              resources,
              rsmTransformPolicy: 'ToSts',
              serviceAccountName: data.dbName,
              volumeClaimTemplates: [
                {
                  name: 'data',
                  spec: {
                    accessModes: ['ReadWriteOnce'],
                    resources: {
                      requests: {
                        storage: `${data.storage}Gi`
                      }
                    }
                  }
                }
              ]
            },
            {
              componentDefRef: 'minio',
              monitor: false,
              name: 'minio',
              noCreatePDB: false,
              replicas: data.replicas,
              resources,
              rsmTransformPolicy: 'ToSts',
              serviceAccountName: data.dbName,
              volumeClaimTemplates: [
                {
                  name: 'data',
                  spec: {
                    accessModes: ['ReadWriteOnce'],
                    resources: {
                      requests: {
                        storage: `${data.storage}Gi`
                      }
                    }
                  }
                }
              ]
            }
          ],
          terminationPolicy,
          tolerations: []
        }
      }
    ]
  };

  return map[data.dbType].map((item) => yaml.dump(item)).join('\n---\n');
};

export const json2Account = (data: DBEditType) => {
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
        name: data.dbName,
        namespace: getUserNamespace()
      }
    ]
  };

  const baseRoleRules = [
    {
      apiGroups: [''],
      resources: ['events'],
      verbs: ['create']
    },
    {
      apiGroups: [''],
      resources: ['configmaps'],
      verbs: ['create', 'get', 'list', 'patch', 'update', 'watch', 'delete']
    },
    {
      apiGroups: [''],
      resources: ['endpoints'],
      verbs: ['create', 'get', 'list', 'patch', 'update', 'watch', 'delete']
    },
    {
      apiGroups: [''],
      resources: ['pods'],
      verbs: ['get', 'list', 'patch', 'update', 'watch']
    }
  ];

  const BackupRoleRules = [
    {
      apiGroups: ['dataprotection.kubeblocks.io'],
      resources: ['backups'],
      verbs: ['create', 'get', 'list', 'patch', 'update', 'watch', 'delete']
    },
    {
      apiGroups: ['dataprotection.kubeblocks.io'],
      resources: ['backups/status'],
      verbs: ['create', 'get', 'list', 'patch', 'update', 'watch', 'delete']
    }
  ];

  const pgAccountTemplate = [
    commonBase,
    {
      ...dbRolesBase,
      rules: [...baseRoleRules, ...BackupRoleRules]
    },
    dbRoleBindingBase
  ];

  const map = {
    [DBTypeEnum.postgresql]: pgAccountTemplate,
    [DBTypeEnum.mysql]: [
      commonBase,
      {
        ...dbRolesBase,
        rules: [
          {
            apiGroups: [''],
            resources: ['events'],
            verbs: ['create']
          },
          ...BackupRoleRules
        ]
      },
      dbRoleBindingBase
    ],
    [DBTypeEnum.mongodb]: [
      commonBase,
      {
        ...dbRolesBase,
        rules: [
          {
            apiGroups: ['apps.kubeblocks.io'],
            resources: ['clusters'],
            verbs: ['get', 'list']
          },
          {
            apiGroups: ['apps.kubeblocks.io'],
            resources: ['clusters/status'],
            verbs: ['get']
          },
          ...baseRoleRules,
          ...BackupRoleRules
        ]
      },
      dbRoleBindingBase
    ],
    [DBTypeEnum.redis]: [
      commonBase,
      {
        ...dbRolesBase,
        rules: [
          {
            apiGroups: [''],
            resources: ['events'],
            verbs: ['create']
          },
          ...BackupRoleRules
        ]
      },
      dbRoleBindingBase
    ],
    [DBTypeEnum.kafka]: pgAccountTemplate,
    [DBTypeEnum.qdrant]: pgAccountTemplate,
    [DBTypeEnum.nebula]: pgAccountTemplate,
    [DBTypeEnum.weaviate]: pgAccountTemplate,
    [DBTypeEnum.milvus]: pgAccountTemplate
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

export const json2StartOrStop = ({ dbName, type }: { dbName: string; type: 'Start' | 'Stop' }) => {
  const template = {
    apiVersion: 'apps.kubeblocks.io/v1alpha1',
    kind: 'OpsRequest',
    metadata: {
      name: `ops-stop-${dayjs().format('YYYYMMDDHHmmss')}`,
      labels: {
        [crLabelKey]: dbName
      }
    },
    spec: {
      clusterRef: dbName,
      type
    }
  };
  return yaml.dump(template);
};

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
        [BACKUP_REMARK_LABEL_KEY]: remark
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
    milvus: ''
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
    kafka: '',
    qdrant: '',
    nebula: '',
    weaviate: '',
    milvus: ''
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
    redis: {},
    kafka: {},
    qdrant: {},
    nebula: {},
    weaviate: {},
    milvus: {}
  };

  const template = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: `${dbDetail.dbName}-export`,
      labels: {
        'app.kubernetes.io/instance': dbDetail.dbName,
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
        'app.kubernetes.io/instance': dbDetail.dbName
      },
      type: 'NodePort'
    }
  };

  return yaml.dump(template);
};
