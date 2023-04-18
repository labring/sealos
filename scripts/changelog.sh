#!/bin/bash
# Copyright © 2022 sealos.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
REPO=$1
TAG=$2

if [ -z "$REPO" ]; then
   REPO="$GITHUB_REPOSITORY"
fi

if [ -z "$TAG" ]; then
   TAG=$(git describe --abbrev=0 --tags)
fi

# Fetch the release data using the GitHub API
release_data=$(curl -s https://api.github.com/repos/"${REPO}"/releases/tags/"${TAG}")

# Extract the release notes using jq
release_notes=$(echo "$release_data" | jq -r '.body')

if [ "$release_notes" == 'null' ]; then
   echo "No release notes found for tag $TAG"
   exit 1
fi

echo "$release_notes" > CHANGELOG/CHANGELOG-"${TAG#v}".md

VERSION=$TAG
PREV_VERSION=$3
VERSION=${VERSION#v}
if [ -z "$PREV_VERSION" ]; then
  PREV_VERSION=$(git describe --abbrev=0 --tags v${VERSION}^)
fi
PREV_VERSION=${PREV_VERSION#v}

# shellcheck disable=SC2129
cat << EOF >> CHANGELOG/CHANGELOG-"${VERSION}".md
## Changelog since v${PREV_VERSION}

### What's Changed
EOF

git log --pretty=format:"* %h - %an - %s" v"${PREV_VERSION}"...v"${VERSION}" | sed -E 's/#[0-9]+/https:\/\/github.com\/labring\/sealos\/pull\/&/g' >>  CHANGELOG/CHANGELOG-"${VERSION}".md

echo -e "\n\n**Full Changelog**: https://github.com/$REPO/compare/v${PREV_VERSION}...v${VERSION}" >>  CHANGELOG/CHANGELOG-"${VERSION}".md


# shellcheck disable=SC2028
echo "\n# Changelog" > CHANGELOG/CHANGELOG.md
echo -e "\nAll notable changes to this project will be documented in this file.\n" >> CHANGELOG/CHANGELOG.md

for file in $(ls CHANGELOG |grep -v '^CHANGELOG.md$' | sort -V -r); do
    version=$(echo $file | sed -E 's/CHANGELOG-(.*)\.md/\1/')
    echo -e "- [CHANGELOG-${version}.md](./CHANGELOG-${version}.md)" >> CHANGELOG/CHANGELOG.md
done
