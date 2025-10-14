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
cd "$(dirname "$0")" >/dev/null 2>&1 || exit
source common.sh
storage=${1:-/var/lib/registry}
ver_ge() {
  # usage: ver_ge "4.19.57" "4.18"
  awk -v a="$1" -v b="$2" 'BEGIN{
    split(a,A,"[.-]"); split(b,B,"[.-]");
    for(i=1;i<=3;i++){ if(A[i]=="") A[i]=0; if(B[i]=="") B[i]=0 }
    for(i=1;i<=3;i++){ if(A[i]>B[i]){print 0; exit} else if(A[i]<B[i]){print 1; exit} }
    print 0
  }'
}
check_port_inuse
if ! command_exists iptables; then
  error "iptables command not found, please install iptables"
fi

if command_exists docker; then
  error "docker already exist, uninstall docker and retry"
fi
if command_exists containerd; then
  error "containerd already exist, remove containerd and retry"
fi
check_cmd_exits docker
check_cmd_exits containerd
check_file_exits /var/run/docker.sock
check_file_exits /run/containerd/containerd.sock
check_file_exits $storage
if ! command_exists apparmor_parser; then
  sed -i 's/disable_apparmor = false/disable_apparmor = true/g' ../etc/config.toml
  warn "Replace disable_apparmor = false to disable_apparmor = true"
fi

if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root. Please re-run as root or with sudo."
fi
if [[ "$(uname -s)" != "Linux" ]]; then
  error "This script only supports Linux."
fi
for cmd in curl iptables; do
  if ! command -v $cmd &>/dev/null; then
    error "The $cmd is not installed. Please install $cmd and re-run the script."
  fi
done
if ! command -v lvm &>/dev/null; then
  warn "Warning: lvm is not installed. Some commercial features (such as upgrades) may be unavailable."
fi
arch=$(uname -m)
if [[ "$arch" != "x86_64" && "$arch" != "aarch64" ]]; then
  error "Host CPU architecture must be AMD64 (x86_64) or AArch64 (aarch64). Current: $arch"
fi
bash kernel.sh
logger "check root,port,cri success"
