---
sidebar_position: 8
---

# 设置自定义域名证书

在「应用管理」中成功设置自定义域名，但是无法访问域名并显示证书不安全。 这是因为 cert-manager 没有成功签发证书。为了解决这个问题，我们可以手动设置证书。

首先，确认在云厂商中成功设置 CNAME，并且下载域名对应的证书。

打开「应用管理」，设置自定义域名。

![](./images/set-cert1.png)

打开「终端」，依次执行以下命令。

```bash
# 用证书文件信息创建 tls.crt（使用证书文件信息替换掉 xxxx）
cat > tls.crt <<EOF
-----BEGIN CERTIFICATE-----
xxxx
-----END CERTIFICATE-----
EOF

# 用证书私钥信息创建 tls.key（使用证书私钥信息替换掉 xxxx）
cat > tls.key <<EOF
-----BEGIN RSA PRIVATE KEY-----
xxxx
-----END RSA PRIVATE KEY-----
EOF

# 使用 tls.crt 和 tls.key 创建 secret
kubectl create secret tls network-test --cert tls.crt --key tls.key

# 查看应用对应的 ingress
kubectl get ingress 
```

![](./images/set-cert2.png)

修改 ingress（使用自己的自定义域名替换掉 xzy-dev.sealos.run）。

```bash
kubectl patch ingress network-twvuqmjzckur -p '{"spec":{"tls":[{"hosts":["xzy-dev.sealos.run"],"secretName":"network-test"}]}}'
```

![](./images/set-cert3.png)

测试效果。

![](./images/set-cert4.png)