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

cat << EOF > CHANGELOG/CHANGELOG-${VERSION}.md
- [v${VERSION}](#v400)
  - [Downloads for v${VERSION}](#downloads-for-)
    - [Source Code](#source-code)
    - [Client Binaries](#client-binaries)
  - [Usage](#usage)
  - [Changelog since v${VERSION}](#changelog-since-)
  - [NewContributors](#new-contributors)


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


## Changelog since v${VERSION}

### What's Changed




EOF
