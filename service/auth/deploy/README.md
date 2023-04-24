### How to build image

```shell
sealos build -t docker.io/labring/sealos-auth-service:dev -f Kubefile .
```

### Env

| Name                       | Description                                   | Default                              |
|----------------------------|-----------------------------------------------|--------------------------------------|
| `cloudDomain`              | sealos cloud domain                           | `cloud.example.com`                  |
| `wildcardCertSecretName`   | wildcard cert secret name                     | `wildcard-cert`                      |
| `callbackUrl`              | callback url                                  | `cloud.example.com/login/callback`   |
| `ssoEndpoint`              | sso endpoint                                  | `login.cloud.example.com`            |
| `casdoorMysqlRootPassword` | casdoor's mysql root password (base64 format) | `c2VhbG9zMjAyMw==`                   |

### How to run

```shell
sealos run 
    --env cloudDomain="cloud.sealos.io" \
    --env wildcardCertSecretName="wildcard-cert" \
    --env callbackUrl="https://cloud.sealos.io/login/callback"
    --env ssoEndpoint="https://login.cloud.sealos.io"
    --env casdoorMysqlRootPassword="c2VhbG9zMjAyMw=="
    docker.io/labring/sealos-auth-service:dev
```
