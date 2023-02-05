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

cat << EOF > Note.md
### Usage
\`\`\`sh
# 下载并安装sealos, sealos是个golang的二进制工具，直接下载拷贝到bin目录即可, release页面也可下载
wget  https://github.com/${USERNAME:-labring}/sealos/releases/download/${VERSION}/sealos_${VERSION##v}_linux_amd64.tar.gz  && \\
    tar -zxvf sealos_${VERSION##v}_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
# 创建一个集群
sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
    --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
    --nodes 192.168.64.21,192.168.64.19 \
    --passwd your-own-ssh-passwd
\`\`\`

### Docker images

sealos:

\`\`\`
docker pull ghcr.io/${USERNAME:-labring}/sealos:${VERSION}
\`\`\`

lvscare:

\`\`\`
docker pull ghcr.io/${USERNAME:-labring}/lvscare:${VERSION}
\`\`\`

### APT 源

Use your public APT Repository URL to install DEB packages:

\`\`\`
https://apt.fury.io/${USERNAME:-labring}/
\`\`\`

To enable, add the following file **/etc/apt/sources.list.d/fury.list**:

\`\`\`
deb [trusted=yes] https://apt.fury.io/${USERNAME:-labring}/ /
\`\`\`

### Yum源

Use your public YUM Repository URL to install RPM packages:

\`\`\`
https://yum.fury.io/${USERNAME:-labring}/
\`\`\`

To enable, add the following file **/etc/yum.repos.d/fury.repo**:

\`\`\`
[fury]
name=Gemfury Private Repo
baseurl=https://yum.fury.io/${USERNAME:-labring}/
enabled=1
gpgcheck=0
\`\`\`

See [the CHANGELOG](https://github.com/${USERNAME:-labring}/sealos/blob/main/CHANGELOG/CHANGELOG.md) for more details.

EOF
