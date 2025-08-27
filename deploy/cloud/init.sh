#!/bin/bash
set -e
export readonly ARCH=${1:-amd64}
mkdir -p tars

RetryPullImageInterval=1000
RetrySleepSeconds=15

retryPullImage() {
    local image=$1
    local retry=0
    set +e
    while [ $retry -lt $RetryPullImageInterval ]; do
        sealos pull --policy=always --platform=linux/"${ARCH}" $image >/dev/null && break
        retry=$(($retry + 1))
        echo "retry pull image $image, retry times: $retry"
        sleep $RetrySleepSeconds
    done
    set -e
}

declare -A images=(
  # controllers
  ["ghcr.io/labring/sealos-cloud-user-controller:latest"]="user.tar"
  ["ghcr.io/labring/sealos-cloud-terminal-controller:latest"]="terminal.tar"
  ["ghcr.io/labring/sealos-cloud-app-controller:latest"]="app.tar"
  ["ghcr.io/labring/sealos-cloud-resources-controller:latest"]="monitoring.tar"
  ["ghcr.io/labring/sealos-cloud-account-controller:latest"]="account.tar"
  ["ghcr.io/labring/sealos-cloud-license-controller:latest"]="license.tar"

  # frontends
  ["ghcr.io/labring/sealos-cloud-desktop-frontend:latest"]="frontend-desktop.tar"
  ["ghcr.io/labring/sealos-cloud-terminal-frontend:latest"]="frontend-terminal.tar"
  ["ghcr.io/labring/sealos-cloud-applaunchpad-frontend:latest"]="frontend-applaunchpad.tar"
  ["ghcr.io/labring/sealos-cloud-dbprovider-frontend:latest"]="frontend-dbprovider.tar"
  ["ghcr.io/labring/sealos-cloud-costcenter-frontend:latest"]="frontend-costcenter.tar"
  ["ghcr.io/labring/sealos-cloud-template-frontend:latest"]="frontend-template.tar"
  ["ghcr.io/labring/sealos-cloud-license-frontend:latest"]="frontend-license.tar"
  ["ghcr.io/labring/sealos-cloud-cronjob-frontend:latest"]="frontend-cronjob.tar"

  # services
  ["ghcr.io/labring/sealos-cloud-database-service:latest"]="database-service.tar"
  ["ghcr.io/labring/sealos-cloud-account-service:latest"]="account-service.tar"
  ["ghcr.io/labring/sealos-cloud-launchpad-service:latest"]="launchpad-service.tar"
  ["ghcr.io/labring/sealos-cloud-job-init-controller:latest"]="job-init.tar"
  ["ghcr.io/labring/sealos-cloud-job-heartbeat-controller:latest"]="job-heartbeat.tar"
)

mkdir -p tars

for img in "${!images[@]}"; do
  echo "=== Pulling $img ==="
  retryPullImage "$img"

  tar_name=${images[$img]}
  echo "=== Saving $img to tars/$tar_name ==="
  sealos save -o "tars/$tar_name" "$img"
done