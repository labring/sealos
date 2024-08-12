import { getUserNamespace } from './user'
import { crLabelKey } from '@/constants/devbox'
import { DevboxEditType } from '@/types/devbox'

/**
 * Generates account info, potentially linked to a cluster via ownerId.
 * Primarily server-side.
 *
 * @param data Data for account creation.
 * @param ownerId Optional owner ID for cluster association.
 * @returns Generated account info.
 */
export const json2Account = (data: DevboxEditType, ownerId?: string) => {
  const commonLabels = {
    [crLabelKey]: data.devboxName,
    'app.kubernetes.io/instance': data.devboxName,
    'app.kubernetes.io/managed-by': 'kbcli'
  }

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
            name: data.devboxName
          }
        ]
      }),
      name: data.devboxName
    }
  }

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
            name: data.devboxName
          }
        ]
      }),
      name: data.devboxName
    }
  }

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
            name: data.devboxName
          }
        ]
      }),
      name: data.devboxName
    },
    roleRef: {
      apiGroup: 'rbac.authorization.k8s.io',
      kind: 'Role',
      name: data.devboxName
    },
    subjects: [
      {
        kind: 'ServiceAccount',
        name: data.devboxName
      }
    ]
  }

  const baseRoleRules = [
    {
      apiGroups: ['*'],
      resources: ['*'],
      verbs: ['*']
    }
  ]

  const pgAccountTemplate = [
    commonBase,
    {
      ...dbRolesBase,
      rules: baseRoleRules
    },
    dbRoleBindingBase
  ]

  const map = {
    [DevboxTypeEnum.postgresql]: pgAccountTemplate,
    [DevboxTypeEnum.mysql]: pgAccountTemplate,
    [DevboxTypeEnum.mongodb]: pgAccountTemplate,
    [DevboxTypeEnum.redis]: pgAccountTemplate,
    [DevboxTypeEnum.kafka]: pgAccountTemplate,
    [DevboxTypeEnum.qdrant]: pgAccountTemplate,
    [DevboxTypeEnum.nebula]: pgAccountTemplate,
    [DevboxTypeEnum.weaviate]: pgAccountTemplate,
    [DevboxTypeEnum.milvus]: pgAccountTemplate
  }
  return map[data.dbType].map((item) => yaml.dump(item)).join('\n---\n')
}

/**
 * Convert data for creating a database cluster to YAML configuration.
 * Used for client display, server logic handles actual creation.
 *
 * @param data Data for creating the database cluster.
 * @param backupInfo Optional backup data for database restoration.
 * @returns Generated YAML configuration.
 */
export const json2CreateCluster = (data: DevboxEditType, backupInfo?: BackupItemType) => {
  const resources = {
    limits: {
      cpu: `${str2Num(Math.floor(data.cpu))}m`,
      memory: `${str2Num(data.memory)}Mi`
    },
    requests: {
      cpu: `${Math.floor(str2Num(data.cpu) * 0.1)}m`,
      memory: `${Math.floor(str2Num(data.memory) * 0.1)}Mi`
    }
  }
  const terminationPolicy = backupInfo?.name ? 'WipeOut' : 'Delete'
  const metadata = {
    finalizers: ['cluster.kubeblocks.io/finalizer'],
    labels: {
      'clusterdefinition.kubeblocks.io/name': data.dbType,
      'clusterversion.kubeblocks.io/name': data.dbVersion,
      [crLabelKey]: data.devboxName
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
    name: data.devboxName
  }

  const storageClassName = StorageClassName ? { storageClassName: StorageClassName } : {}

  const redisHA = RedisHAConfig(data.replicas > 1)

  const map = {
    [DevboxTypeEnum.postgresql]: [
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
          clusterDefinitionRef: 'postgresql',
          clusterVersionRef: data.dbVersion,
          componentSpecs: [
            {
              componentDefRef: 'postgresql',
              monitor: true,
              name: 'postgresql',
              replicas: data.replicas,
              resources,
              serviceAccountName: data.devboxName,
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
    [DevboxTypeEnum.mysql]: [
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
          clusterDefinitionRef: 'apecloud-mysql',
          clusterVersionRef: data.dbVersion,
          componentSpecs: [
            {
              componentDefRef: 'mysql',
              monitor: true,
              name: 'mysql',
              replicas: data.replicas,
              resources,
              serviceAccountName: data.devboxName,
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
    [DevboxTypeEnum.mongodb]: [
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
            topologyKeys: ['kubernetes.io/hostname']
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
              serviceAccountName: data.devboxName,
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
    [DevboxTypeEnum.redis]: [
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
          clusterDefinitionRef: 'redis',
          clusterVersionRef: data.dbVersion,
          componentSpecs: [
            {
              componentDefRef: 'redis',
              monitor: true,
              name: 'redis',
              replicas: data.replicas,
              resources,
              serviceAccountName: data.devboxName,
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
              serviceAccountName: data.devboxName,
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
    [DevboxTypeEnum.kafka]: [
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
              serviceAccountName: data.devboxName,
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
              serviceAccountName: data.devboxName,
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
              serviceAccountName: data.devboxName,
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
              serviceAccountName: data.devboxName,
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
    [DevboxTypeEnum.qdrant]: [
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
              serviceAccountName: data.devboxName,
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
    [DevboxTypeEnum.nebula]: [
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
              serviceAccountName: data.devboxName,
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
              serviceAccountName: data.devboxName,
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
              serviceAccountName: data.devboxName,
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
              serviceAccountName: data.devboxName,
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
    [DevboxTypeEnum.weaviate]: [
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
              serviceAccountName: data.devboxName,
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
    [DevboxTypeEnum.milvus]: [
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
              serviceAccountName: data.devboxName,
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
              serviceAccountName: data.devboxName,
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
              serviceAccountName: data.devboxName,
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
  }

  return map[data.dbType].map((item) => yaml.dump(item)).join('\n---\n')
}

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
`
