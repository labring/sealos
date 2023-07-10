# Sealos cloud cluster image

## usage

### prepare

1. A cloud domain and dns to your k8s cluster. Suppose your domain name is `cloud.example.io`.
2. A TLS cert that resolves `cloud.example.io` and `*.cloud.example.io`

### save your cert file to a sealos config file

```yaml
# tls-secret.yaml
apiVersion: apps.sealos.io/v1beta1
kind: Config
metadata:
  name: secret
spec:
  path: manifests/tls-secret.yaml
  match: ghcr.io/labring/sealos-cloud:latest
  strategy: merge
  data: |
    data:
      tls.crt: <your-tls.crt-base64>
      tls.key: <your-tls.key-base64>
```

### run sealos cloud cluster image
```shell
sealos run ghcr.io/labring/sealos-cloud:latest --config-file tls-secret.yaml --env cloudDomain="cloud.example.com"
```
