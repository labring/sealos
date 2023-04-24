#!/bin/bash
REPO_NAME=${1:-sealos-patch}
IMAGE_NAME=ghcr.io/${OWNER}/${REPO_NAME}:$GIT_COMMIT_SHORT_SHA
sudo sealos push "${IMAGE_NAME}"-amd64
sudo sealos push "${IMAGE_NAME}"-arm64
sudo sealos images
sudo sealos manifest create "${IMAGE_NAME}"
sudo sealos manifest add "$IMAGE_NAME" docker://"$IMAGE_NAME-amd64"
sudo sealos manifest add "$IMAGE_NAME" docker://"$IMAGE_NAME-arm64"
sudo sealos manifest push --all "$IMAGE_NAME" docker://"$IMAGE_NAME" && echo "$IMAGE_NAME push success"
sudo sealos images
