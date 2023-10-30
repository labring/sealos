### How to build image

```shell
sealos build -t docker.io/labring/sealos-cloud-desktop:latest -f Kubefile .
```

### Env

| Name                       | Description                 | Default                                |
|----------------------------|-----------------------------|----------------------------------------|
| `cloudDomain`              | sealos cloud domain         | `cloud.example.com`                    |
| `wildcardCertSecretName`   | wildcard cert secret name   | `wildcard-cert`                        |

### Config

If you enable password login (which is enabled by default), you need to set the password salt by using a config file.

And this is a command to generate a password salt:
```shell
echo -n "your-password-salt" | base64
```


Here is a config file example:
```yaml
# desktop-config.yaml
apiVersion: apps.sealos.io/v1beta1
kind: Config
metadata:
  name: secret
spec:
  path: manifests/secret.yaml
  match: docker.io/labring/sealos-cloud-desktop:latest
  strategy: merge
  data: |
    data:
      mongodb_uri: <your-mongodb-uri-base64>
      jwt_secret: <your-jwt-secret-base64>
      password_salt: <your-password-salt-base64>
```

*Please make sure `spec.match` is the same as the image you want to run*

### How to run

```shell
sealos run \
    --env cloudDomain="127.0.0.1.nip.io" \
    --env wildcardCertSecretName="wildcard-cert" \
    --env passwordEnabled="true" \
    docker.io/labring/sealos-cloud-desktop:latest \
    --config-file desktop-config.yaml 
```
