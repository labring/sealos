### How to build image

```shell
sealos build -t docker.io/sealost/desktop:latest -f Kubefile .
```

### Env

| Name                       | Description                 | Default                                |
|----------------------------|-----------------------------|----------------------------------------|
| `cloudDomain`              | sealos cloud domain         | `cloud.example.com`                    |
| `wildcardCertSecretName`   | wildcard cert secret name   | `wildcard-cert`                        |
### How to run

```shell
sealos run 
    --env cloudDomain="cloud.sealos.io" \
    --env wildcardCertSecretName="wildcard-cert" \
    docker.io/sealost/desktop:latest
```
