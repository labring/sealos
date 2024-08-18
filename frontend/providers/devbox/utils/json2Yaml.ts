import yaml from 'js-yaml'

import { getUserNamespace } from './user'
import { DevboxEditType } from '@/types/devbox'

export const json2Devbox = (data: DevboxEditType) => {
  const json = {
    apiVersion: 'devbox.sealos.io/v1alpha1',
    kind: 'Devbox',
    metadata: {
      name: data.name
    },
    spec: {
      network: {
        type: 'NodePort',
        extraPorts: [
          {
            containerPort: 8080,
            hostPort: 8080,
            protocol: 'TCP'
          }
        ]
      },
      resource: {
        cpu: data.cpu,
        memory: data.memory
      },
      runtimeRef: {
        name: `${data.runtimeType}-${data.runtimeVersion}`
      },
      state: 'Running'
    }
  }

  return yaml.dump(json)
}
export const json2StartOrStop = ({
  devboxName,
  type
}: {
  devboxName: string
  type: 'Stopped' | 'Running'
}) => {
  const json = {
    apiVersion: 'devbox.sealos.io/v1alpha1',
    kind: 'Devbox',
    metadata: {
      name: devboxName
    },
    spec: {
      state: type
    }
  }
  return yaml.dump(json)
}

export const json2DevboxRelease = (data: {
  devboxName: string
  tag: string
  releaseDes: string
}) => {
  const json = {
    apiVersion: 'devbox.sealos.io/v1alpha1',
    kind: 'DevBoxRelease',
    metadata: {
      name: `${data.devboxName}-${data.tag}`
    },
    spec: {
      devboxName: data.devboxName,
      newTag: data.tag,
      notes: data.releaseDes
    }
  }
  return yaml.dump(json)
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
