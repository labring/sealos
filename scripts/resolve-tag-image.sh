#!/bin/bash
set -ex
SHA_TAG="sha-${GIT_COMMIT_SHORT_SHA}"
tag_name="$SHA_TAG"

push_image=${1:-false}
is_tag=${2:-false}
push_tag_name=${3}

if [[ "$is_tag" == true ]]; then
  tag_name=${GITHUB_REF#refs/tags/}
elif [[ "$push_image" == true ]]; then
  if [[ -n "$push_tag_name" ]]; then
    tag_name=$push_tag_name
  fi
fi

echo "tag_name=$tag_name" >> "$GITHUB_OUTPUT"
echo "$tag_name"