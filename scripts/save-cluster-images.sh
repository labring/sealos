#!/bin/bash

IMAGE=localhost:5000/labring/lvscare:$GIT_COMMIT_SHORT_SHA-$ARCH
PATCH=docker.io/labring/patch:$GIT_COMMIT_SHORT_SHA-$ARCH
PATCH_DIR=docker/patch

# resolve buildah conflicts
sudo apt remove buildah
sudo apt autoremove

# use correct image name
mkdir -p $PATCH_DIR/images/shim
echo "$IMAGE" > $PATCH_DIR/images/shim/lvscareImage
sed -i "s#__lvscare__#$IMAGE#g" $PATCH_DIR/Dockerfile

# download sealos
wget https://github.com/labring/sealos/releases/download/v4.0.0/sealos_4.0.0_linux_amd64.tar.gz
tar -zxf sealos_4.0.0_linux_amd64.tar.gz sealos
chmod +x sealos

# build and save patch image
sudo sealos build -t $PATCH --platform linux/$ARCH -f $PATCH_DIR/Dockerfile $PATCH_DIR
sudo sealos save -o patch-$ARCH.tar $PATCH
