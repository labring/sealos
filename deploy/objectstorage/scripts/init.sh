#!/bin/bash

# 1. create minio instance
bash scripts/minio.sh
# 2. create prometheus instance
bash scripts/prometheus.sh
# 3. run objectstorage controller
sealos run ghcr.io/labring/sealos-cloud-objectstorage-controller:latest -e cloudDomain=${cloudDomain}
# 4. run objectstorage frontend
sealos run ghcr.io/labring/sealos-cloud-objectstorage-frontend:latest -e cloudDomain=${cloudDomain}
# 5. run objectstorage monitor service
sealos run ghcr.io/labring/sealos-cloud-minio-service:latest -e cloudDomain=${cloudDomain}
