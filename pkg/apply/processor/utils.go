// Copyright © 2022 sealos.
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

package processor

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
)

func TrimHostIP(cluster *v2.Cluster, ip string) {
	hosts := cluster.Spec.Hosts
	logger.Debug("hosts before trim: %s ", hosts)
	for i := 0; i < len(hosts); i++ {
		ips := hosts[i].IPS
		idx := -1
		for j := 0; j < len(ips); j++ {
			if ip == ips[j] {
				idx = j
			}
		}
		if idx == -1 {
			continue
		}
		logger.Info("trim host ip %s", hosts[i].IPS[idx])
		if len(hosts[i].IPS) == 1 {
			hosts = append(hosts[:i], hosts[i+1:]...)
		} else {
			hosts[i].IPS = append(hosts[i].IPS[:idx], hosts[i].IPS[idx+1:]...)
		}
		break
	}
	logger.Debug("hosts after trim: %s ", hosts)
	cluster.Spec.Hosts = hosts
}

func AddMasterIP(cluster *v2.Cluster, ip string) {
	host := v2.Host{}
	//set host ips
	defaultPort := strconv.Itoa(int(cluster.Spec.SSH.Port))
	ip, port := iputils.GetHostIPAndPortOrDefault(ip, defaultPort)
	host.IPS = []string{fmt.Sprintf("%s:%s", ip, port)}
	//set host roles
	clusterSSH := cluster.GetSSH()
	sshClient := ssh.NewSSHClient(&clusterSSH, true)
	host.Roles = []string{v2.MASTER, GetHostArch(sshClient, ip)}
	//add host to cluster
	cluster.Spec.Hosts = append(cluster.Spec.Hosts, host)
}

func AddNodeIP(cluster *v2.Cluster, ip string) {
	host := v2.Host{}
	//set host ips
	defaultPort := strconv.Itoa(int(cluster.Spec.SSH.Port))
	ip, port := iputils.GetHostIPAndPortOrDefault(ip, defaultPort)
	host.IPS = []string{fmt.Sprintf("%s:%s", ip, port)}
	//set host roles
	clusterSSH := cluster.GetSSH()
	sshClient := ssh.NewSSHClient(&clusterSSH, true)
	host.Roles = []string{v2.NODE, GetHostArch(sshClient, ip)}
	//add host to cluster
	cluster.Spec.Hosts = append(cluster.Spec.Hosts, host)
}

// GetHostArch returns the host architecture of the given ip using SSH.
// Note that hosts of the same type(master/node) must have the same architecture,
// so we only need to check the first host of the given type.
func GetHostArch(sshClient ssh.Interface, ip string) string {
	var arch = string(v2.AMD64)

	cmd, err := sshClient.Cmd(ip, "arch")
	if err != nil {
		logger.Error("get host arch failed: %v, defaults to amd64", err)
		return arch
	}
	cmdStr := strings.TrimSpace(string(cmd))
	if cmdStr != "x86_64" {
		arch = string(v2.ARM64)
	}

	return arch
}
