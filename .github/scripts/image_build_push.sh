#!/bin/bash
set -e
name=${1:-"kubernetes"}
version=${2:-"v1.28.15"}
TOKEN=${3:-"changeme"}
ARCH=${4:-"amd64"}
AUTHOR=${5:-"labring"}
COMMIT_ID=${6:-"latest"}
IMAGE_NAME="ghcr.io/${AUTHOR}/sealos/${name}:${version}"

commitDATE=$(date +%Y%m%d%H%M%S)
sealos login -u "${AUTHOR}" -p "${TOKEN}" ghcr.io
sealos build --pull=always --platform=linux/"${ARCH}" -t "$IMAGE_NAME"-"${ARCH}" \
  --label org.opencontainers.image.description="kubernetes and app cluster image" \
  --label org.opencontainers.image.licenses="Sealos Sustainable Use License" \
  --label org.opencontainers.image.source="https://github.com/${AUTHOR}/sealos" \
  --label org.opencontainers.image.title="sealos-image" \
  --label org.opencontainers.image.time="${commitDATE}" \
  --label org.opencontainers.image.url="https://github.com/${AUTHOR}/sealos" \
  --label org.opencontainers.image.version="${version}" \
  --label org.opencontainers.image.revision="${COMMIT_ID}" .

sealos push "$IMAGE_NAME"-"${ARCH}"
sealos rmi  -p --force || true

