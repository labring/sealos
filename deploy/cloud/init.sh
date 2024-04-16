#!/bin/bash
set -e
export readonly ARCH=${1:-amd64}
mkdir -p tars

RetryPullImageInterval=3
RetrySleepSeconds=3

retryPullImage() {
    local image=$1
    local retry=0
    local retryMax=3
    set +e
    while [ $retry -lt $RetryPullImageInterval ]; do
        sealos pull --policy=always --platform=linux/"${ARCH}" $image >/dev/null && break
        retry=$(($retry + 1))
        echo "retry pull image $image, retry times: $retry"
        sleep $RetrySleepSeconds
    done
    set -e
    if [ $retry -eq $retryMax ]; then
        echo "pull image $image failed"
        exit 1
    fi
}

retryPullImage ghcr.io/labring/sealos-cloud-user-controller:latest
retryPullImage ghcr.io/labring/sealos-cloud-terminal-controller:latest
retryPullImage ghcr.io/labring/sealos-cloud-app-controller:latest
retryPullImage ghcr.io/labring/sealos-cloud-resources-controller:latest
retryPullImage ghcr.io/labring/sealos-cloud-account-controller:latest
retryPullImage ghcr.io/labring/sealos-cloud-license-controller:latest

retryPullImage ghcr.io/labring/sealos-cloud-desktop-frontend:latest
retryPullImage ghcr.io/labring/sealos-cloud-terminal-frontend:latest
retryPullImage ghcr.io/labring/sealos-cloud-applaunchpad-frontend:latest
retryPullImage ghcr.io/labring/sealos-cloud-dbprovider-frontend:latest
retryPullImage ghcr.io/labring/sealos-cloud-costcenter-frontend:latest
retryPullImage ghcr.io/labring/sealos-cloud-template-frontend:latest
retryPullImage ghcr.io/labring/sealos-cloud-license-frontend:latest
retryPullImage ghcr.io/labring/sealos-cloud-cronjob-frontend:latest

retryPullImage ghcr.io/labring/sealos-cloud-database-service:latest
retryPullImage ghcr.io/labring/sealos-cloud-account-service:latest
retryPullImage ghcr.io/labring/sealos-cloud-launchpad-service:latest
retryPullImage ghcr.io/labring/sealos-cloud-job-init-controller:latest
retryPullImage ghcr.io/labring/sealos-cloud-job-heartbeat-controller:latest

sealos save -o tars/user.tar ghcr.io/labring/sealos-cloud-user-controller:latest
sealos save -o tars/terminal.tar ghcr.io/labring/sealos-cloud-terminal-controller:latest
sealos save -o tars/app.tar ghcr.io/labring/sealos-cloud-app-controller:latest
sealos save -o tars/monitoring.tar ghcr.io/labring/sealos-cloud-resources-controller:latest
sealos save -o tars/account.tar ghcr.io/labring/sealos-cloud-account-controller:latest
sealos save -o tars/license.tar ghcr.io/labring/sealos-cloud-license-controller:latest

sealos save -o tars/frontend-desktop.tar  ghcr.io/labring/sealos-cloud-desktop-frontend:latest
sealos save -o tars/frontend-terminal.tar  ghcr.io/labring/sealos-cloud-terminal-frontend:latest
sealos save -o tars/frontend-dbprovider.tar ghcr.io/labring/sealos-cloud-dbprovider-frontend:latest
sealos save -o tars/frontend-costcenter.tar ghcr.io/labring/sealos-cloud-costcenter-frontend:latest
sealos save -o tars/frontend-applaunchpad.tar ghcr.io/labring/sealos-cloud-applaunchpad-frontend:latest
sealos save -o tars/frontend-template.tar ghcr.io/labring/sealos-cloud-template-frontend:latest
sealos save -o tars/frontend-license.tar ghcr.io/labring/sealos-cloud-license-frontend:latest
sealos save -o tars/frontend-cronjob.tar ghcr.io/labring/sealos-cloud-cronjob-frontend:latest

sealos save -o tars/database-service.tar ghcr.io/labring/sealos-cloud-database-service:latest
sealos save -o tars/account-service.tar ghcr.io/labring/sealos-cloud-account-service:latest
sealos save -o tars/launchpad-service.tar ghcr.io/labring/sealos-cloud-launchpad-service:latest
sealos save -o tars/job-init.tar ghcr.io/labring/sealos-cloud-job-init-controller:latest
sealos save -o tars/job-heartbeat.tar ghcr.io/labring/sealos-cloud-job-heartbeat-controller:latest
