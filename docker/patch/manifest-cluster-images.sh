#!/bin/bash
IMAGE_NAME=ghcr.io/labring/sealos-merge-patch:$GIT_COMMIT_SHORT_SHA
sudo sealos push ${IMAGE_NAME}-amd64
sudo sealos push ${IMAGE_NAME}-arm64
sudo buildah images
sudo buildah manifest create ${IMAGE_NAME}
sudo buildah manifest add "$IMAGE_NAME" docker://"$IMAGE_NAME-amd64"
sudo buildah manifest add "$IMAGE_NAME" docker://"$IMAGE_NAME-arm64"
sudo buildah manifest push --all "$IMAGE_NAME" docker://"$IMAGE_NAME" && echo "$IMAGE_NAME push success"
sudo buildah images
