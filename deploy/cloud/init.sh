#!/bin/bash
mkdir -p tars
sealos pull ghcr.io/labring/sealos-cloud-user-controller:nightly
sealos pull ghcr.io/labring/sealos-cloud-terminal-controller:nightly
sealos pull ghcr.io/labring/sealos-cloud-app-controller:nightly
sealos pull ghcr.io/labring/sealos-cloud-desktop-frontend:nightly
sealos pull ghcr.io/labring/sealos-cloud-terminal-frontend:nightly
sealos pull ghcr.io/labring/sealos-cloud-applaunchpad-frontend:nightly



sealos save -o tars/user.tar ghcr.io/labring/sealos-cloud-user-controller:nightly
sealos save -o tars/terminal.tar ghcr.io/labring/sealos-cloud-terminal-controller:nightly
sealos save -o tars/app.tar ghcr.io/labring/sealos-cloud-app-controller:nightly
sealos save -o tars/frontend-desktop.tar  ghcr.io/labring/sealos-cloud-desktop-frontend:nightly
sealos save -o tars/frontend-terminal.tar  ghcr.io/labring/sealos-cloud-terminal-frontend:nightly
sealos save -o tars/frontend-applaunchpad.tar ghcr.io/labring/sealos-cloud-applaunchpad-frontend:nightly

