#!/bin/bash

IMAGE=localhost:5000/labring/lvscare:$COMMIT_SHA-$ARCH
PATCH=docker.io/labring/patch:$COMMIT_SHA-$ARCH
SEALOS=docker/sealos/sealos-$ARCH
PATCH_DIR=docker/patch

# resolve buildah conflicts
sudo apt remove buildah
sudo apt autoremove

# use correct image name
mkdir -p $PATCH_DIR/images/shim
echo "$IMAGE" > $PATCH_DIR/images/shim/lvscareImage
sed -i "s#__lvscare__#$IMAGE#g" $PATCH_DIR/Dockerfile

# make sure sealos binary is executable, build and save patch image
chmod +x $SEALOS
sudo $SEALOS build -t $PATCH --platform linux/$ARCH -f $PATCH_DIR/Dockerfile $PATCH_DIR
sudo $SEALOS save -o patch-$ARCH.tar $PATCH
