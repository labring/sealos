### How to build image

```shell
sealos build -t docker.io/labring/sealos-terminal-controller:dev -f Dockerfile .
```

### Env

| Name | Description               | Default |
| --- |---------------------------| --- |
|`USER_NAMESPACE`| user controller namespace |`user-system`|

### How to run

```shell
sealos run --env USER_NAMESPACE=user-system  docker.io/labring/sealos-terminal-controller:dev
```
