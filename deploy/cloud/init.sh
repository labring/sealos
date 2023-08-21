#!/bin/bash
mkdir -p tars
sealos pull --policy=always ghcr.io/labring/sealos-cloud-user-controller:latest
sealos pull --policy=always ghcr.io/labring/sealos-cloud-terminal-controller:latest
sealos pull --policy=always ghcr.io/labring/sealos-cloud-app-controller:latest
sealos pull --policy=always ghcr.io/labring/sealos-cloud-desktop-frontend:latest
sealos pull --policy=always ghcr.io/labring/sealos-cloud-terminal-frontend:latest
sealos pull --policy=always ghcr.io/labring/sealos-cloud-applaunchpad-frontend:latest
sealos pull --policy=always ghcr.io/labring/sealos-cloud-dbprovider-frontend:latest
sealos pull --policy=always ghcr.io/labring/sealos-cloud-resources-metering-controller:latest
sealos pull --policy=always ghcr.io/labring/sealos-cloud-resources-controller:latest
sealos pull --policy=always ghcr.io/labring/sealos-cloud-account-controller:latest
sealos pull --policy=always ghcr.io/labring/sealos-cloud-costcenter-frontend:latest
sealos pull --policy=always ghcr.io/labring/sealos-cloud-licenseissuer-controller:latest
sealos pull --policy=always ghcr.io/labring/sealos-cloud-template-frontend:latest

sealos save -o tars/user.tar ghcr.io/labring/sealos-cloud-user-controller:latest
sealos save -o tars/terminal.tar ghcr.io/labring/sealos-cloud-terminal-controller:latest
sealos save -o tars/app.tar ghcr.io/labring/sealos-cloud-app-controller:latest
sealos save -o tars/metering.tar ghcr.io/labring/sealos-cloud-resources-metering-controller:latest
sealos save -o tars/monitoring.tar ghcr.io/labring/sealos-cloud-resources-controller:latest
sealos save -o tars/account.tar ghcr.io/labring/sealos-cloud-account-controller:latest
sealos save -o tars/licenseissuer.tar ghcr.io/labring/sealos-cloud-licenseissuer-controller:latest

sealos save -o tars/frontend-desktop.tar  ghcr.io/labring/sealos-cloud-desktop-frontend:latest
sealos save -o tars/frontend-terminal.tar  ghcr.io/labring/sealos-cloud-terminal-frontend:latest
sealos save -o tars/frontend-dbprovider.tar ghcr.io/labring/sealos-cloud-dbprovider-frontend:latest
sealos save -o tars/frontend-costcenter.tar ghcr.io/labring/sealos-cloud-costcenter-frontend:latest
sealos save -o tars/frontend-applaunchpad.tar ghcr.io/labring/sealos-cloud-applaunchpad-frontend:latest
sealos save -o tars/frontend-template.tar ghcr.io/labring/sealos-cloud-template-frontend:latest
