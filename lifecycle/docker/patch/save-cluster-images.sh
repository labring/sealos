#!/bin/bash

IMAGE=localhost:5000/${OWNER}/lvscare:$GIT_COMMIT_SHORT_SHA-$ARCH
PATCH=ghcr.io/${OWNER}/sealos-patch:$GIT_COMMIT_SHORT_SHA-$ARCH
PATCH_DIR=lifecycle/docker/patch
SEALOS=sudo sealos
SEALOS_VERSION=4.1.7

if [ -z "${ARCH}" ]; then
  ARCH=$(uname -m)
fi

case "${ARCH}" in
  amd64|x86_64)
    ARCH=amd64
    SEALOS_ARCH=amd64
    ;;
  arm64|aarch64)
    ARCH=arm64
    SEALOS_ARCH=arm64
    ;;
  *)
    echo "Unsupported ARCH: ${ARCH}" >&2
    exit 1
    ;;
esac

# download sealos
wget https://github.com/labring/sealos/releases/download/v${SEALOS_VERSION}/sealos_${SEALOS_VERSION}_linux_${SEALOS_ARCH}.tar.gz
tar -zxf sealos_${SEALOS_VERSION}_linux_${SEALOS_ARCH}.tar.gz sealos
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
