#!/bin/bash

# 0.create minio-operator
# sealos run ghcr.io/labring/minio-operator:v5.0.6
# 1. create minio instance
bash scripts/minio.sh
# 2. create prometheus instance
bash scripts/prometheus.sh
# 3. run objectstorage controller
sealos run ghcr.io/nowinkeyy/sealos-cloud-objectstorage-controller:latest
# 4. run objectstorage frontend
sealos run ghcr.io/nowinkeyy/sealos-cloud-objectstorage-frontend:latest
# 5. run objectstorage monitor service
sealos run ghcr.io/nowinkeyy/sealos-cloud-minio-service:latest
