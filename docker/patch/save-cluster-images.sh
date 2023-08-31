#!/bin/bash

IMAGE=localhost:5000/${OWNER}/lvscare:$GIT_COMMIT_SHORT_SHA-$ARCH
PATCH=ghcr.io/${OWNER}/sealos-patch:$GIT_COMMIT_SHORT_SHA-$ARCH
PATCH_DIR=docker/patch
SEALOS=sudo sealos
SEALOS_VERSION=4.1.7

# download sealos
wget https://github.com/labring/sealos/releases/download/v${SEALOS_VERSION}/sealos_${SEALOS_VERSION}_linux_amd64.tar.gz
tar -zxf sealos_${SEALOS_VERSION}_linux_amd64.tar.gz sealos
chmod +x sealos && sudo mv sealos /usr/bin/sealos

# resolve buildah conflicts
sudo apt remove buildah
sudo apt autoremove

# use correct image name
# shellcheck disable=SC2164
cd ${PATCH_DIR}
mkdir -p images/shim
echo "${IMAGE}" > images/shim/lvscareImage
sed -i "s#__lvscare__#${IMAGE}#g" Dockerfile

sudo sealos build -t "${PATCH}" --label=sealos.io.type=patch --label=image="${IMAGE}" --platform linux/"${ARCH}" -f Dockerfile .

# save patch image
cd - && sudo sealos save -o patch-"${ARCH}".tar "${PATCH}"
