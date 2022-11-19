#!/bin/bash

IMAGE=localhost:5000/labring/lvscare:$GIT_COMMIT_SHORT_SHA-$ARCH
PATCH=ghcr.io/labring/sealos-merge-patch:$GIT_COMMIT_SHORT_SHA-$ARCH
PATCH_DIR=docker/patch
SEALOS=sudo sealos

# download sealos
wget https://github.com/labring/sealos/releases/download/v4.0.0/sealos_4.0.0_linux_amd64.tar.gz
tar -zxf sealos_4.0.0_linux_amd64.tar.gz sealos
chmod +x sealos && sudo mv sealos /usr/bin/sealos

# resolve buildah conflicts
sudo apt remove buildah
sudo apt autoremove

# use correct image name
cd $PATCH_DIR
mkdir -p images/shim
echo "$IMAGE" > images/shim/lvscareImage
sed -i "s#__lvscare__#$IMAGE#g" Dockerfile

# build patch image, must be under $PATCH_DIR
sudo sealos build -t $PATCH --platform linux/$ARCH -f Dockerfile .

# save patch image
cd - && sudo sealos save -o patch-$ARCH.tar $PATCH
