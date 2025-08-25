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
TAG=$1
PRE_VERSION=$2

if [ -z "${TAG}" ]; then
    echo "Usage: $0 <tag> <previous_version>"
    echo "Example: $0 v1.0.0 v0.9.0"
    exit 1
fi

if [ ! -d CHANGELOG ]; then
    mkdir CHANGELOG
fi

if command -v git-chglog &> /dev/null; then
    echo "git-chglog is installed, proceeding with changelog generation."
else
    echo "git-chglog is not installed. Will install it first."
    wget -q https://github.com/git-chglog/git-chglog/releases/download/v0.15.4/git-chglog_0.15.4_linux_amd64.tar.gz
    tar -zxvf git-chglog_0.15.4_linux_amd64.tar.gz git-chglog &> /dev/null
    sudo mv git-chglog /usr/local/bin/
    git-chglog --version
    rm -rf git-chglog_0.15.4_linux_amd64.tar.gz
fi

git-chglog --repository-url https://github.com/labring/sealos --output CHANGELOG/CHANGELOG-"${TAG#v}".md --next-tag ${TAG} ${TAG}

echo "# Changelog" > CHANGELOG/CHANGELOG.md
echo -e "\nAll notable changes to this project will be documented in this file.\n" >> CHANGELOG/CHANGELOG.md

for file in $(ls CHANGELOG |grep -v '^CHANGELOG.md$' | sort -V -r); do
    version=$(echo $file | sed -E 's/CHANGELOG-(.*)\.md/\1/')
    echo -e "- [CHANGELOG-${version}.md](./CHANGELOG-${version}.md)" >> CHANGELOG/CHANGELOG.md
done

## check version is release version
if [[ ${TAG} =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "!!!!! is release version, will update docs"
    sed -i "s#${PRE_VERSION}#${TAG}#g" scripts/cloud/install.sh
    sed -i "s#${PRE_VERSION}#${TAG}#g" scripts/cloud/build-offline-tar.sh
fi