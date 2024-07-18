---
sidebar_position: 2
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

# 卸载对象存储

安装「对象存储」失败，可以使用脚本清理残留资源，卸载「对象存储」也可以使用脚本清理。

```bash
#!/usr/bin/env bash
set +e

kubectl delete app objectstorage -n app-system
kubectl delete ns objectstorage-system objectstorage-frontend
helm uninstall minio-operator -n minio-system
kubectl delete ns minio-system
kubectl delete crd objectstoragebuckets.objectstorage.sealos.io objectstorageusers.objectstorage.sealos.io
kubectl delete clusterrole objectstorage-manager-role objectstorage-metrics-reader objectstorage-proxy-role
kubectl delete clusterrolebinding objectstorage-manager-rolebinding objectstorage-proxy-rolebinding
```