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

echo "### Usage" >> Note.md
echo "
\`\`\`sh
# 下载并安装sealos, sealos是个golang的二进制工具，直接下载拷贝到bin目录即可, release页面也可下载
wget -c https://sealyun-home.oss-cn-beijing.aliyuncs.com/sealos-4.0/latest/sealos-amd64 -O sealos && \\
    chmod +x sealos && mv sealos /usr/bin
# 创建一个集群
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 \
    --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
    --nodes 192.168.64.21,192.168.64.19 \
    --passwd your-own-ssh-passwd

\`\`\`
" >> Note.md

echo "### [amd64 sealos 下载地址]" >> Note.md
echo "[oss 下载地址](https://${BUCKETNAME:-sealyun-home}.${OSSENDPOINT:-oss-cn-beijing.aliyuncs.com}/sealos-4.0/${VERSION}/sealos-amd64)" >> Note.md
echo "[latest 版本 oss 下载地址](https://${BUCKETNAME:-sealyun-home}.${OSSENDPOINT:-oss-cn-beijing.aliyuncs.com}/sealos-4.0/latest/sealos-amd64)" >> Note.md
echo "### [arm64 sealos 下载地址]" >> Note.md
echo "[oss 下载地址](https://${BUCKETNAME:-sealyun-home}.${OSSENDPOINT:-oss-cn-beijing.aliyuncs.com}/sealos-4.0/${VERSION}/sealos-arm64)" >> Note.md
echo "[latest 版本 oss下载地址](https://${BUCKETNAME:-sealyun-home}.${OSSENDPOINT:-oss-cn-beijing.aliyuncs.com}/sealos-4.0/latest/sealos-arm64)" >> Note.md

echo "### [amd64 buildah 下载地址]" >> Note.md
echo "[oss下载地址](https://sealyun-home.oss-accelerate.aliyuncs.com/images/buildah.linux.amd64)" >> Note.md
echo "### [arm64 buildah 下载地址]" >> Note.md
echo "[oss下载地址](https://sealyun-home.oss-accelerate.aliyuncs.com/images/buildah.linux.arm64)" >> Note.md
