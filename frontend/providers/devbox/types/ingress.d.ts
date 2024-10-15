export interface IngressListItemType {
  metadata: {
    name: string
    namespace: string
    creationTimestamp?: Date
    labels?: { [key: string]: string }
  }
  spec: {
    rules: {
      host: string
      http: {
        paths: {
          path: string
          pathType: string
          backend: {
            service: {
              name: string
              port: number
            }
          }
        }[]
      }
    }[]
    tls?: {
      hosts: string[]
      secretName: string
    }[]
  }
}
