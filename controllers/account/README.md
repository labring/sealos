
创建微信支付所需要的 secret
选择 secret 的方式是因为 WechatPrivateKey 有很多特殊符号很容易解析错误，先base64加密之后通过secret是一种比较合适的办法。

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: payment-secret
  namespace: account-system
type: Opaque
data:
  MchID: xxxx
  AppID: xxxxx
  MchAPIv3Key: xxxx
  MchCertificateSerialNumber: xxxx
  WechatPrivateKey: xxxx
```


### 部署方式
```
sealos run docker.io/labring/sealos-account-controller:dev

```

