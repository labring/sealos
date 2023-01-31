### 部署方式
```
先提前修改image: controller:latest,修改为自己打的镜像
kubectl apply -f deploy/manifests/deploy.yaml
```

创建微信支付所需要的secret
选择secret的方式是因为WechatPrivateKey有很多特殊符号很容易解析错误，先base64加密之后通过secret是一种比较合适的办法。

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