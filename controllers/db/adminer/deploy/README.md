### How to build image

```shell
sealos build -t docker.io/labring/sealos-db-adminer-controller:latest -f Dockerfile .
```

### How to run

```shell
sealos run docker.io/labring/sealos-db-adminer-controller:latest
```

### How to delete

```shell
# For high-level deployment deletion, use the corresponding deploy delete script
# For controller-only deletion, use the make target:
make undeploy
```
