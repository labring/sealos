#!/bin/bash
set -ex
SHA_TAG=${GIT_COMMIT_SHORT_SHA}
tag_name="$SHA_TAG"

push_image=${1:-false}
release=${2:-false}

if [[ "$push_image" == true ]]; then
  tag_name=${3}
elif [[ "$release" == true ]]; then
  tag_name=${GITHUB_REF#refs/tags/}
fi

echo "tag_name=$tag_name" >> "$GITHUB_OUTPUT"
echo "$tag_name"