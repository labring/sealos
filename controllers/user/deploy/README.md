### How to build image

```shell
sealos build -t docker.io/labring/sealos-user-controller:dev -f Dockerfile .
```

### Env

| Name | Description                                            | Default |
| --- |--------------------------------------------------------| --- |
|`WechatPrivateKey`| Wechat private key                                     |``|
|`MchID`| Wechat mch id                                          |``|
|`MchCertificateSerialNumber`| Wechat mch certificate serial number                   |``|
|`MchAPIv3Key`| Wechat mch api v3 key                                  |``|
|`AppID`| Wechat app id,if emoty then disable payment controller |``|

### How to run

```shell
sealos run docker.io/labring/kustomize:v4.5.6
sealos run --env WechatPrivateKey=xxx --env MchID=xxx --env MchCertificateSerialNumber --env MchAPIv3Key=xxx --env  AppID=xxx docker.io/labring/sealos-user-controller:dev
```
