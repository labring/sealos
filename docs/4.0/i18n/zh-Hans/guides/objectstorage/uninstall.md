---
sidebar_position: 2
---

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