#!/usr/bin/env bash
set -euxo pipefail
# You may need to call rlespinasse/git-commit-data-action@v1 before calling this script
IF_CUSTOM=${1:-false}
TAGGED=${2:-false}
TAG=${GIT_COMMIT_SHORT_SHA:-latest}

if [[ "$IF_CUSTOM" == true ]]; then
  TAG=${3:-$GIT_COMMIT_SHORT_SHA}
elif [[ "$TAGGED" == true ]]; then
  TAG=${GITHUB_REF#refs/tags/}
fi

echo "tag_name=$TAG" >> "$GITHUB_OUTPUT"
echo "$TAG"