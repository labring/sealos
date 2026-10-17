#!/usr/bin/env bash
set -euo pipefail

: "${IMAGE_REPO:?IMAGE_REPO is required}"
: "${BUILD_TAG:?BUILD_TAG is required}"
: "${DOCKER_METADATA_OUTPUT_TAGS:?output tags are required}"
MIRROR_REPO=${MIRROR_REPO:-}

# Resolve both architectures before publishing any public tag. BUILD_TAG is
# unique to this workflow run and attempt, so concurrent builds cannot mix.
repos=("${IMAGE_REPO}")
if [[ -n "${MIRROR_REPO}" ]]; then
  repos+=("${MIRROR_REPO}")
fi
for repo in "${repos[@]}"; do
  for arch in amd64 arm64; do
    docker manifest inspect "${repo}:${BUILD_TAG}-${arch}" >/dev/null
  done
done

while IFS= read -r tag; do
  [[ -n "${tag}" ]] || continue
  repo=${tag%:*}
  if [[ "${repo}" != "${IMAGE_REPO}" && ( -z "${MIRROR_REPO}" || "${repo}" != "${MIRROR_REPO}" ) ]]; then
    echo "unexpected image repository: ${repo}" >&2
    exit 1
  fi
  docker manifest create "${tag}" \
    "${repo}:${BUILD_TAG}-amd64" "${repo}:${BUILD_TAG}-arm64"
  for arch in amd64 arm64; do
    docker manifest annotate "${tag}" "${repo}:${BUILD_TAG}-${arch}" --os linux --arch "${arch}"
  done
  docker manifest push --purge "${tag}"
done <<< "${DOCKER_METADATA_OUTPUT_TAGS}"
