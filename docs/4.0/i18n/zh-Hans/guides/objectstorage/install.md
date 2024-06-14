---
sidebar_position: 1
---

# 部署对象存储

下载 helm 图表。

```bash
curl -O https://raw.githubusercontent.com/minio/operator/master/helm-releases/operator-5.0.6.tgz
```

安装 minio-operator。

```bash
helm install --namespace minio-system --create-namespace minio-operator operator-5.0.6.tgz
```

安装 Minio、Controller 等。

```bash
# DOMAIN 是 Sealos 集群的域名
# 环境变量设置 Minio 管理员账户（默认的 Minio 管理员账户为 username/passw0rd）
# -e minioAdminUser={16位随机大小写字符串} -e minioAdminPassword={32位随机大小写字符串}
sealos run ghcr.io/labring/sealos-cloud-objectstorage:latest -e cloudDomain={DOMAIN}
```