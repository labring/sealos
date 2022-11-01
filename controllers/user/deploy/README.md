### How to build image

```shell
sealos build -t docker.io/labring/sealos-user-controller:dev -f Dockerfile .
```

### Env

| Name | Description | Default |
| --- | --- | --- |
|`PaymentCallbackURL`|Payment callback url|`http://localhost:8080/payment/callback`|

### How to run

```shell
sealos run --env PaymentCallbackURL=http://localhost:8080/payment/callback  docker.io/labring/sealos-user-controller:dev
```
