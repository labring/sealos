
创建infra所需要的 secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: infra-secret
  namespace: infra-system
type: Opaque
data:
  AWS_ACCESS_KEY_ID: xxxx
  AWS_SECRET_ACCESS_KEY: xxxxx
  AWS_DEFAULT_REGION: xxxx
```


### 部署方式
```
sealos run docker.io/labring/sealos-account-controller:dev

```

