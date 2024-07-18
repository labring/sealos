---
sidebar_position: 3
---

# 自定义域名

想让您的用户能够享受与您的品牌一致的专属体验？只需要在应用启动的时候为你的项目指定一个自定义域名。

自定义域名有两种情况，分别是部署时接入和部署完成后接入。

## 部署时接入

如果您在部署应用时接入自定义域名，只需要在部署应用时打开「外网访问」，Sealos 会给您的应用自动分配一个外网域名。

![](./images/app-launchpad-domain.png)

然后需要到您的域名服务商处，添加该域名的 `CNAME` 解析到上面分配的外网域名。以阿里云为例：

![](./images/aliyun-cname.png)

等待解析生效后即可回到 Sealos 中绑定自定义域名，直接点击右侧的「自定义域名」：

![](./images/app-launchpad-domain2.png)

在弹出的界面中输入您的自定义域名，然后点击确认即可。

![](./images/app-launchpad-domain3.png)

最终点击右上角的「部署」开始部署应用，部署完成后点击外网地址即可通过自定义域名访问应用。

### 设置自定义域名证书

在「应用管理」中成功设置自定义域名，但是无法访问域名并显示证书不安全。 这是因为 cert-manager 没有成功签发证书。为了解决这个问题，我们可以手动设置证书。

首先，确认在云厂商中成功设置 CNAME，并且下载域名对应的证书。

打开「应用管理」，设置自定义域名。



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

![](./images/set-cert2.png)修改 ingress（使用自己的自定义域名替换掉 xzy-dev.sealos.run）。

```bash
kubectl patch ingress network-twvuqmjzckur -p '{"spec":{"tls":[{"hosts":["xzy-dev.sealos.run"],"secretName":"network-test"}]}}'
```

![](./images/set-cert3.png)

测试效果。

![](https://bearsblog.oss-cn-beijing.aliyuncs.com/img/set-cert4.png)

## 部署完成后接入

已经部署完成的应用可以在应用详情页面的右上角点击「变更」，然后参考之前的步骤接入自定义域名即可。