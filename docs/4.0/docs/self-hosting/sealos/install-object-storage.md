---
sidebar_position: 2
---

# Install Object Storage

Download the Helm charts.

```bash
curl -O https://raw.githubusercontent.com/minio/operator/master/helm-releases/operator-5.0.6.tgz
```

Install Operator.

```bash
helm install --namespace minio-system --create-namespace minio-operator operator-5.0.6.tgz
```

Install Minio, Controller, etc.

```bash
# DOMAIN is the domain name for the Sealos cluster
# Set environment variables for Minio admin account (default Minio admin account is username/passw0rd)
# -e minioAdminUser={16-character random alphanumeric string} -e minioAdminPassword={32-character random alphanumeric string}
sealos run ghcr.io/labring/sealos-cloud-objectstorage:latest -e cloudDomain={DOMAIN}
```

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