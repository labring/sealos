import yaml from 'js-yaml'

import { str2Num } from './tools'
import { getUserNamespace } from './user'
import { RuntimeTypeEnum, crLabelKey } from '@/constants/devbox'
import { DevboxEditType } from '@/types/devbox'

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

  const devboxRolesBase = {
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

  const devboxRoleBindingBase = {
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

  const devboxAccountTemplate = [
    commonBase,
    {
      ...devboxRolesBase,
      rules: baseRoleRules
    },
    devboxRoleBindingBase
  ]

  const map = {
    [RuntimeTypeEnum.java]: devboxAccountTemplate,
    [RuntimeTypeEnum.go]: devboxAccountTemplate,
    [RuntimeTypeEnum.python]: devboxAccountTemplate,
    [RuntimeTypeEnum.node]: devboxAccountTemplate,
    [RuntimeTypeEnum.rust]: devboxAccountTemplate,
    [RuntimeTypeEnum.php]: devboxAccountTemplate,
    [RuntimeTypeEnum.custom]: devboxAccountTemplate
  }
  return map[data.runtimeType].map((item) => yaml.dump(item)).join('\n---\n')
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
