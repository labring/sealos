#!/bin/bash
mkdir -p tars
sealos pull ghcr.io/labring/sealos-cloud-user-controller:latest
sealos pull ghcr.io/labring/sealos-cloud-terminal-controller:latest
sealos pull ghcr.io/labring/sealos-cloud-app-controller:latest
sealos pull ghcr.io/labring/sealos-cloud-desktop-frontend:latest
sealos pull ghcr.io/labring/sealos-cloud-terminal-frontend:latest
sealos pull ghcr.io/labring/sealos-cloud-applaunchpad-frontend:latest
sealos pull ghcr.io/labring/sealos-cloud-dbprovider-frontend:latest



sealos save -o tars/user.tar ghcr.io/labring/sealos-cloud-user-controller:latest
sealos save -o tars/terminal.tar ghcr.io/labring/sealos-cloud-terminal-controller:latest
sealos save -o tars/app.tar ghcr.io/labring/sealos-cloud-app-controller:latest
sealos save -o tars/frontend-desktop.tar  ghcr.io/labring/sealos-cloud-desktop-frontend:latest
sealos save -o tars/frontend-terminal.tar  ghcr.io/labring/sealos-cloud-terminal-frontend:latest
sealos save -o tars/frontend-applaunchpad.tar ghcr.io/labring/sealos-cloud-applaunchpad-frontend:latest
sealos save -o tars/frontend-dbprovider.tar ghcr.io/labring/sealos-cloud-dbprovider-frontend:latest
