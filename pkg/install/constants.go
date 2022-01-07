// Copyright © 2021 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package install

const (
	ErrorExitOSCase = -1 // 错误直接退出类型

	ErrorMasterEmpty  = "your master is empty."             // master节点ip为空
	ErrorVersionEmpty = "your kubernetes version is empty." // kubernetes 版本号为空
	ErrorFileNotExist = "your package file is not exist."   // 离线安装包为空

	// etcd backup
	ETCDSNAPSHOTDEFAULTNAME = "snapshot"
	ETCDDEFAULTBACKUPDIR    = "/opt/sealos/etcd-backup"
	ETCDDEFAULTRESTOREDIR   = "/opt/sealos/etcd-restore"
	ETCDDATADIR             = "/var/lib/etcd"
	TMPDIR                  = "/tmp"

	// kube file
	KUBECONTROLLERCONFIGFILE = "/etc/kubernetes/controller-manager.conf"
	KUBESCHEDULERCONFIGFILE  = "/etc/kubernetes/scheduler.conf"
)

const (
	ContainerdShell = `if grep "SystemdCgroup = true"  /etc/containerd/config.toml &> /dev/null; then  
driver=systemd
else
driver=cgroupfs
fi
echo ${driver}`
	DockerShell = `driver=$(docker info -f "{{.CgroupDriver}}")
	echo "${driver}"`
)
