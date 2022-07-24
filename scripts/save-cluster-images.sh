#!/bin/bash

IMAGE=localhost:5000/labring/lvscare:$COMMIT_SHA-$ARCH
PATCH=docker.io/labring/patch:$COMMIT_SHA-$ARCH
PWD=docker/sealos

cd $PWD

# make sure sealos binary is executable and resolve buildah conflicts
chmod +x sealos
sudo apt remove buildah
sudo apt autoremove

# use correct image name
mkdir -p docker/patch/images/shim
echo "$IMAGE" > docker/patch/images/shim/lvscareImage
sed -i "s#__lvscare__#$IMAGE#g" docker/patch/Dockerfile

cd docker/patch

# build and save patch image
sudo $PWD/sealos build -t $PATCH --platform linux/$ARCH .
cd ../.. && sudo $PWD/sealos save -o patch-$ARCH.tar $PATCH
