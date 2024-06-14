---
sidebar_position: 2
---

# Uninstall Object Storage

Installation of the Object Storage failed, you can use the script to clean up the remaining resources. Uninstalling the
Object Storage can also be done using the script to clean up.

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