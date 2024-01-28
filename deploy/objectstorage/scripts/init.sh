#!/bin/bash

# 1. create minio instance
bash minio.sh
# 2. create prometheus instance
bash prometheus.sh
# 3. run objectstorage controller
sealos run ghcr.io/nowinkeyy/sealos-cloud-objectstorage-controller:latest
# 4. run objectstorage frontend
sealos run ghcr.io/nowinkeyy/sealos-cloud-objectstorage-frontend:latest
# 5. run objectstorage monitor service
sealos run ghcr.io/nowinkeyy/sealos-cloud-minio-service:latest
