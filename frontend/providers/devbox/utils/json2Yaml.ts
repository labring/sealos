import yaml from 'js-yaml'

import {
  INGRESS_SECRET,
  SEALOS_DOMAIN,
  runtimeNamespaceMap as defaultRuntimeNamespaceMap
} from '@/stores/static'
import { str2Num } from './tools'
import { getUserNamespace } from './user'
import { DevboxEditType, runtimeNamespaceMapType } from '@/types/devbox'
import { devboxKey, publicDomainKey } from '@/constants/devbox'

export const json2Devbox = (
  data: DevboxEditType,
  runtimeNamespaceMap: runtimeNamespaceMapType = defaultRuntimeNamespaceMap,
  devboxAffinityEnable: string = 'true',
  squashEnable: string = 'false'
) => {
  // runtimeNamespace inject
  const runtimeNamespace = runtimeNamespaceMap[data.runtimeVersion]

  let json: any = {
    apiVersion: 'devbox.sealos.io/v1alpha1',
    kind: 'Devbox',
    metadata: {
      name: data.name
    },
    spec: {
      squash: squashEnable === 'true',
      network: {
        type: 'NodePort',
        extraPorts: data.networks.map((item) => ({
          containerPort: item.port
        }))
      },
      resource: {
        cpu: `${str2Num(Math.floor(data.cpu))}m`,
        memory: `${str2Num(data.memory)}Mi`
      },
      runtimeRef: {
        name: data.runtimeVersion,
        namespace: runtimeNamespace
      },
      state: 'Running'
    }
  }
  if (devboxAffinityEnable === 'true') {
    json.spec.tolerations = [
      {
        key: 'devbox.sealos.io/node',
        operator: 'Exists',
        effect: 'NoSchedule'
      }
    ]
    json.spec.affinity = {
      nodeAffinity: {
        requiredDuringSchedulingIgnoredDuringExecution: {
          nodeSelectorTerms: [
            {
              matchExpressions: [
                {
                  key: 'devbox.sealos.io/node',
                  operator: 'Exists'
                }
              ]
            }
          ]
        }
      }
    }
  }
  return yaml.dump(json)
}

export const json2StartOrStop = ({
  devboxName,
  type
}: {
  devboxName: string
  type: 'Paused' | 'Running'
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
  devboxUid: string
}) => {
  const json = {
    apiVersion: 'devbox.sealos.io/v1alpha1',
    kind: 'DevBoxRelease',
    metadata: {
      name: `${data.devboxName}-${data.tag}`,
      ownerReferences: [
        {
          apiVersion: 'devbox.sealos.io/v1alpha1',
          kind: 'Devbox',
          name: data.devboxName,
          blockOwnerDeletion: false,
          controller: false,
          uid: data.devboxUid
        }
      ]
    },
    spec: {
      devboxName: data.devboxName,
      newTag: data.tag,
      notes: data.releaseDes
    }
  }
  return yaml.dump(json)
}

export const json2Ingress = (
  data: DevboxEditType,
  sealosDomain: string = SEALOS_DOMAIN,
  ingressSecret: string = INGRESS_SECRET
) => {
  // different protocol annotations
  const map = {
    HTTP: {
      'nginx.ingress.kubernetes.io/ssl-redirect': 'false',
      'nginx.ingress.kubernetes.io/backend-protocol': 'HTTP',
      'nginx.ingress.kubernetes.io/client-body-buffer-size': '64k',
      'nginx.ingress.kubernetes.io/proxy-buffer-size': '64k',
      'nginx.ingress.kubernetes.io/proxy-send-timeout': '300',
      'nginx.ingress.kubernetes.io/proxy-read-timeout': '300',
      'nginx.ingress.kubernetes.io/server-snippet':
        'client_header_buffer_size 64k;\nlarge_client_header_buffers 4 128k;\n'
    },
    GRPC: {
      'nginx.ingress.kubernetes.io/ssl-redirect': 'false',
      'nginx.ingress.kubernetes.io/backend-protocol': 'GRPC'
    },
    WS: {
      'nginx.ingress.kubernetes.io/proxy-read-timeout': '3600',
      'nginx.ingress.kubernetes.io/proxy-send-timeout': '3600',
      'nginx.ingress.kubernetes.io/backend-protocol': 'WS'
    }
  }

  const result = data.networks
    .filter((item) => item.openPublicDomain)
    .map((network, i) => {
      const host = network.customDomain
        ? network.customDomain
        : `${network.publicDomain}.${sealosDomain}`

      const secretName = network.customDomain ? network.networkName : ingressSecret

      const ingress = {
        apiVersion: 'networking.k8s.io/v1',
        kind: 'Ingress',
        metadata: {
          name: network.networkName,
          labels: {
            [devboxKey]: data.name,
            [publicDomainKey]: network.publicDomain
          },
          annotations: {
            'kubernetes.io/ingress.class': 'nginx',
            'nginx.ingress.kubernetes.io/proxy-body-size': '32m',
            ...map[network.protocol]
          }
        },
        spec: {
          rules: [
            {
              host,
              http: {
                paths: [
                  {
                    pathType: 'Prefix',
                    path: '/',
                    backend: {
                      service: {
                        name: data.name,
                        port: {
                          number: network.port
                        }
                      }
                    }
                  }
                ]
              }
            }
          ],
          tls: [
            {
              hosts: [host],
              secretName
            }
          ]
        }
      }
      const issuer = {
        apiVersion: 'cert-manager.io/v1',
        kind: 'Issuer',
        metadata: {
          name: network.networkName,
          labels: {
            [devboxKey]: data.name
          }
        },
        spec: {
          acme: {
            server: 'https://acme-v02.api.letsencrypt.org/directory',
            email: 'admin@sealos.io',
            privateKeySecretRef: {
              name: 'letsencrypt-prod'
            },
            solvers: [
              {
                http01: {
                  ingress: {
                    class: 'nginx',
                    serviceType: 'ClusterIP'
                  }
                }
              }
            ]
          }
        }
      }
      const certificate = {
        apiVersion: 'cert-manager.io/v1',
        kind: 'Certificate',
        metadata: {
          name: network.networkName,
          labels: {
            [devboxKey]: data.name
          }
        },
        spec: {
          secretName,
          dnsNames: [network.customDomain],
          issuerRef: {
            name: network.networkName,
            kind: 'Issuer'
          }
        }
      }

      let resYaml = yaml.dump(ingress)
      if (network.customDomain) {
        resYaml += `\n---\n${yaml.dump(issuer)}\n---\n${yaml.dump(certificate)}`
      }
      return resYaml
    })

  return result.join('\n---\n')
}

export const json2Service = (data: DevboxEditType) => {
  if (data.networks.length === 0) {
    return ''
  }
  const template = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: data.name,
      labels: {
        [devboxKey]: data.name
      }
    },
    spec: {
      ports: data.networks.map((item, i) => ({
        port: str2Num(item.port),
        targetPort: str2Num(item.port),
        name: item.portName
      })),
      selector: {
        ['app.kubernetes.io/name']: data.name,
        ['app.kubernetes.io/part-of']: 'devbox',
        ['app.kubernetes.io/managed-by']: 'sealos'
      }
    }
  }
  return yaml.dump(template)
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
