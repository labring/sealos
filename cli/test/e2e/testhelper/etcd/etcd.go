/*
Copyright 2023 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package etcd

import (
	"os"

	"github.com/labring/sealos/test/e2e/testhelper/cmd"
)

type Etcd struct {
	cmd.Interface
}

func NewEtcd() *Etcd {
	return &Etcd{
		Interface: &cmd.LocalCmd{},
	}
}

const installScript = `
#!/bin/bash
ETCD_VER=v3.4.24
GITHUB_URL=https://github.com/etcd-io/etcd/releases/download
DOWNLOAD_URL=${GITHUB_URL}

rm -f /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz
rm -rf /tmp/etcd-download-test && mkdir -p /tmp/etcd-download-test

echo "Download ETCD binary"
curl -L ${DOWNLOAD_URL}/${ETCD_VER}/etcd-${ETCD_VER}-linux-amd64.tar.gz -o /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz
tar xzvf /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz -C /tmp/etcd-download-test --strip-components=1
rm -f /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz

echo "ETCD info"
/tmp/etcd-download-test/etcd --version
/tmp/etcd-download-test/etcdctl version

echo "Start a local ETCD server"
ALLOW_NONE_AUTHENTICATION=yes
nohup /tmp/etcd-download-test/etcd --listen-client-urls http://0.0.0.0:2379 \
  --advertise-client-urls http://0.0.0.0:2379 > output.file 2>&1 &
`

func (e *Etcd) Install() error {
	err := os.WriteFile("/tmp/install_etcd.sh", []byte(installScript), 0755)
	if err != nil {
		return err
	}
	return e.AsyncExec("bash", "-c", "/tmp/install_etcd.sh")
}
