#!/bin/bash
set -e

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

mkdir -p images/shim

echo ""  > images/shim/allImage.txt

for img in "${!images[@]}"; do
  echo "=== Pulling $img ==="
  echo "$img" >> images/shim/allImage.txt
done