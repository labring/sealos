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
VERSION=$1
PREV_VERSION=$2
if [ -z "$VERSION" ]; then
    VERSION=$(git describe --abbrev=0 --tags)
fi

VERSION=${VERSION#v}

if [ -z "$PREV_VERSION" ]; then
  PREV_VERSION=$(git describe --abbrev=0 --tags v${VERSION}^)
fi

PREV_VERSION=${PREV_VERSION#v}

VERSION_POINT=${VERSION//./}
PREV_VERSION_POINT=${PREV_VERSION//./}

cat << EOF > CHANGELOG/CHANGELOG-${VERSION}.md
- [v${VERSION}](#v${VERSION_POINT})
  - [Downloads for v${VERSION}](#downloads-for-v${VERSION_POINT})
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v${PREV_VERSION}](#changelog-since-v${PREV_VERSION_POINT})

# [v${VERSION}](https://github.com/labring/sealos/releases/tag/v${VERSION})

## Downloads for v${VERSION}

### Source Code

filename |
-------- |
[v${VERSION}.tar.gz](https://github.com/labring/sealos/archive/refs/tags/v${VERSION}.tar.gz) |

### Client Binaries

filename |
-------- |
[sealos_${VERSION}_linux_amd64.tar.gz](https://github.com/labring/sealos/releases/download/v${VERSION}/sealos_${VERSION}_linux_amd64.tar.gz) |
[sealos_${VERSION}_linux_arm64.tar.gz](https://github.com/labring/sealos/releases/download/v${VERSION}/sealos_${VERSION}_linux_arm64.tar.gz) |

## Usage

amd64:

\`\`\`shell
wget  https://github.com/labring/sealos/releases/download/v${VERSION}/sealos_${VERSION}_linux_amd64.tar.gz  && \
    tar -zxvf sealos_${VERSION}_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
\`\`\`

arm64:

\`\`\`shell
wget  https://github.com/labring/sealos/releases/download/v${VERSION}/sealos_${VERSION}_linux_arm64.tar.gz  && \
    tar -zxvf sealos_${VERSION}_linux_arm64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
## create a cluster for sealos
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19 --passwd your-own-ssh-passwd
\`\`\`

## Changelog since v${PREV_VERSION}

### What's Changed
EOF

git log --pretty=format:"* %h - %an - %s" v${PREV_VERSION}...v${VERSION} | sed -E 's/#[0-9]+/https:\/\/github.com\/labring\/sealos\/pull\/&/g' >>  CHANGELOG/CHANGELOG-${VERSION}.md

echo -e "\n\n**Full Changelog**: https://github.com/labring/sealos/compare/v${PREV_VERSION}...v${VERSION}" >>  CHANGELOG/CHANGELOG-${VERSION}.md


echo "# Changelog" > CHANGELOG/CHANGELOG.md
echo -e "\nAll notable changes to this project will be documented in this file.\n" >> CHANGELOG/CHANGELOG.md

for file in $(ls CHANGELOG |grep -v '^CHANGELOG.md$' | sort -V -r); do
    version=$(echo $file | sed -E 's/CHANGELOG-(.*)\.md/\1/')
    echo -e "- [CHANGELOG-${version}.md](./CHANGELOG-${version}.md)" >> CHANGELOG/CHANGELOG.md
done
