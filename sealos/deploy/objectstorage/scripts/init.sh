#!/bin/bash

# 1. create minio instance
bash scripts/minio.sh
# 2. create prometheus instance(Deprecated, now use vm)
# bash scripts/prometheus.sh
# 3. run objectstorage controller
sealos run tars/objectstorage-controller.tar -e cloudDomain=${cloudDomain}
# 4. run objectstorage frontend
sealos run tars/objectstorage-frontend.tar -e cloudDomain=${cloudDomain}
# 5. run objectstorage monitor service
sealos run tars/objectstorage-service.tar -e cloudDomain=${cloudDomain}
