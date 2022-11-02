### How to build image

```shell
sealos build -t docker.io/labring/sealos-auth-service:dev -f Kubefile .
```

### Env

| Name | Description | Default |
| --- | --- | --- |
|`callbackUrlEnv`|callback url env|`CASDOOR_CALLBACK_URL`|
|`clientSecretEnv`|client secret env|`CASDOOR_CLIENT_SECRET`|
|`clientIdEnv`|client id env|`CASDOOR_CLIENT_ID`|
|`kubeconfigEnv`|kubeconfig env|`KUBECONFIG`|
|`ssoEndpointEnv`|sso endpoint env|`CASDOOR_SSO_ENDPOINT`|
### How to run

```shell
sealos run --env CASDOOR_CALLBACK_URL=http://localhost:8000/auth/casdoor/callback \
    --env CASDOOR_CLIENT_SECRET=123456 \
    --env CASDOOR_CLIENT_ID=123456 \
    --env CASDOOR_SSO_ENDPOINT=http://localhost:8000 \
    --env KUBECONFIG=/root/.kube/config \
    docker.io/labring/sealos-auth-service:dev
```
