import yaml from 'js-yaml';
import type { DBEditType, DBType } from '@/types/db';
import { str2Num } from '@/utils/tools';
import { DBTypeEnum, DBComponentNameMap } from '@/constants/db';
import { crLabelKey } from '@/constants/db';
import { getUserNamespace } from './user';

export const json2CreateCluster = (data: DBEditType) => {
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
  const metadata = {
    finalizers: ['cluster.kubeblocks.io/finalizer'],
    labels: {
      'clusterdefinition.kubeblocks.io/name': data.dbType,
      'clusterversion.kubeblocks.io/name': data.dbVersion
    },
    name: data.dbName
  };
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
                    storageClassName: 'openebs-lvmpv-backup'
                  }
                }
              ]
            }
          ],
          terminationPolicy: 'Delete',
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
            podAntiAffinity: 'Preferred',
            tenancy: 'SharedNode',
            topologyKeys: []
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
                    }
                  }
                }
              ]
            }
          ],
          terminationPolicy: 'Delete',
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
                    }
                  }
                }
              ]
            }
          ],
          terminationPolicy: 'Delete',
          tolerations: []
        }
      }
    ]
  };

  return map[data.dbType].map((item) => yaml.dump(item)).join('\n---\n');
};

export const json2Account = (data: DBEditType) => {
  const map = {
    [DBTypeEnum.postgresql]: [
      {
        apiVersion: 'v1',
        kind: 'ServiceAccount',
        metadata: {
          labels: {
            'app.kubernetes.io/instance': data.dbName,
            'app.kubernetes.io/managed-by': 'kbcli'
          },
          name: data.dbName
        }
      },
      {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'Role',
        metadata: {
          labels: {
            'app.kubernetes.io/instance': data.dbName,
            'app.kubernetes.io/managed-by': 'kbcli'
          },
          name: data.dbName
        },
        rules: [
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
        ]
      },
      {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'RoleBinding',
        metadata: {
          labels: {
            'app.kubernetes.io/instance': data.dbName,
            'app.kubernetes.io/managed-by': 'kbcli'
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
      }
    ],
    [DBTypeEnum.mysql]: [
      {
        apiVersion: 'v1',
        kind: 'ServiceAccount',
        metadata: {
          labels: {
            'app.kubernetes.io/instance': data.dbName,
            'app.kubernetes.io/managed-by': 'kbcli'
          },
          name: data.dbName
        }
      },
      {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'Role',
        metadata: {
          labels: {
            'app.kubernetes.io/instance': data.dbName,
            'app.kubernetes.io/managed-by': 'kbcli'
          },
          name: data.dbName
        },
        rules: [
          {
            apiGroups: [''],
            resources: ['events'],
            verbs: ['create']
          }
        ]
      },
      {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'RoleBinding',
        metadata: {
          labels: {
            'app.kubernetes.io/instance': data.dbName,
            'app.kubernetes.io/managed-by': 'kbcli'
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
      }
    ],
    [DBTypeEnum.mongodb]: [
      {
        apiVersion: 'v1',
        kind: 'ServiceAccount',
        metadata: {
          labels: {
            'app.kubernetes.io/instance': 'mong',
            'app.kubernetes.io/managed-by': 'kbcli'
          },
          name: data.dbName
        }
      },
      {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'Role',
        metadata: {
          labels: {
            'app.kubernetes.io/instance': 'mong',
            'app.kubernetes.io/managed-by': 'kbcli'
          },
          name: data.dbName
        },
        rules: [
          {
            apiGroups: [''],
            resources: ['events'],
            verbs: ['create']
          }
        ]
      },
      {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'RoleBinding',
        metadata: {
          labels: {
            'app.kubernetes.io/instance': 'mong',
            'app.kubernetes.io/managed-by': 'kbcli'
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
      }
    ]
  };
  return map[data.dbType].map((item) => yaml.dump(item)).join('\n---\n');
};

export const json2VerticalScale = (data: DBEditType) => {
  const template = {
    apiVersion: 'apps.kubeblocks.io/v1alpha1',
    kind: 'OpsRequest',
    metadata: {
      name: 'ops-verticalscaling',
      labels: {
        [crLabelKey]: data.dbName
      }
    },
    spec: {
      clusterRef: data.dbName,
      type: 'VerticalScaling',
      verticalScaling: [
        {
          componentName: DBComponentNameMap[data.dbType],
          resources: {
            limits: {
              cpu: `${str2Num(Math.floor(data.cpu))}m`,
              memory: `${str2Num(data.memory)}Mi`
            },
            requests: {
              cpu: `${Math.floor(str2Num(data.cpu) * 0.1)}m`,
              memory: `${Math.floor(str2Num(data.memory) * 0.1)}Mi`
            }
          }
        }
      ]
    }
  };

  return yaml.dump(template);
};

export const json2VolumeExpansion = ({ dbName, storage, dbType }: DBEditType) => {
  const template = {
    apiVersion: 'apps.kubeblocks.io/v1alpha1',
    kind: 'OpsRequest',
    metadata: {
      name: 'ops-volume-expansion',
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
      name: 'ops-upgrade',
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
      name: 'ops-stop',
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
      name: 'ops-restart',
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

export const json2BackupPvc = ({
  crName,
  dbName,
  storage
}: {
  crName: string;
  dbName: string;
  storage: number;
}) => {
  const template = {
    apiVersion: 'v1',
    kind: 'PersistentVolumeClaim',
    metadata: {
      name: `${crName}-pvc`,
      labels: {
        [crLabelKey]: dbName
      }
    },
    spec: {
      accessModes: ['ReadWriteOnce'],
      resources: {
        requests: {
          storage: `${storage}Gi`
        }
      },
      storageClassName: 'openebs-lvmpv-backup',
      volumeMode: 'Filesystem'
    }
  };
  return yaml.dump(template);
};

export const json2Backup = ({
  crName,
  dbName,
  backupPolicyName
}: {
  crName: string;
  dbName: string;
  backupPolicyName: string;
}) => {
  const template = {
    apiVersion: 'dataprotection.kubeblocks.io/v1alpha1',
    kind: 'Backup',
    metadata: {
      finalizers: ['dataprotection.kubeblocks.io/finalizer'],
      labels: {
        [crLabelKey]: dbName
      },
      name: `${crName}-backup`
    },
    spec: {
      backupPolicyName,
      backupType: 'datafile'
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
`