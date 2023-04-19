import * as yaml from 'js-yaml'

export type ByteBaseStatus = {
  availableReplicas: number
  domain?: string
}

export type ByteBaseForm = {
  namespace: string
  bytebase_name: string
}

// this template is suite for golang(kubernetes and sealos)'s template engine
export const generateByteBaseTemplate = (form: ByteBaseForm): string => {
  const temp = {
    apiVersion: 'bytebase.db.sealos.io/v1',
    kind: 'Bytebase',
    metadata: {
      name: form.bytebase_name,
      namespace: form.namespace,
    },
    spec: {
      image: 'bytebase/bytebase:1.13.0',
      replicas: 1,
      keepalived: '11h',
      ingressType: 'nginx',
      port: 8080,
    },
  }

  try {
    const result = yaml.dump(temp)
    return result
  } catch (error) {
    return ''
  }
}
