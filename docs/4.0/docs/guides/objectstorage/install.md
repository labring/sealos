---
sidebar_position: 1
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