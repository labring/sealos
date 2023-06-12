#!/bin/bash
mkdir -p tars
sealos pull ghcr.io/labring/sealos-cloud-user-controller:dev
sealos pull ghcr.io/labring/sealos-cloud-terminal-controller:dev
sealos pull ghcr.io/labring/sealos-cloud-app-controller:dev
sealos pull ghcr.io/labring/sealos-cloud-desktop-frontend:dev
sealos pull ghcr.io/labring/sealos-cloud-terminal-frontend:dev
sealos pull ghcr.io/labring/sealos-cloud-applaunchpad-frontend:dev
sealos pull ghcr.io/labring/sealos-cloud-dbprovider-frontend:dev


sealos save -o tars/user.tar ghcr.io/labring/sealos-cloud-user-controller:dev
sealos save -o tars/terminal.tar ghcr.io/labring/sealos-cloud-terminal-controller:dev
sealos save -o tars/app.tar ghcr.io/labring/sealos-cloud-app-controller:dev
sealos save -o tars/frontend-desktop.tar  ghcr.io/labring/sealos-cloud-desktop-frontend:dev
sealos save -o tars/frontend-terminal.tar  ghcr.io/labring/sealos-cloud-terminal-frontend:dev
sealos save -o tars/frontend-applaunchpad.tar ghcr.io/labring/sealos-cloud-applaunchpad-frontend:dev
sealos save -o tars/frontend-dbprovider.tar ghcr.io/labring/sealos-cloud-dbprovider-frontend:dev
