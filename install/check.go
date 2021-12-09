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

import (
	"fmt"
	"os"

	"github.com/fanux/sealos/net"

	"github.com/fanux/sealos/pkg/logger"
)

// SetHosts set hosts. if can't access to hostName, set /etc/hosts
func SetHosts(hostIP, hostName string) {
	cmd := fmt.Sprintf("cat /etc/hosts |grep %s || echo '%s %s' >> /etc/hosts", hostName, IPFormat(hostIP), hostName)
	_ = SSHConfig.CmdAsync(hostIP, cmd)
}

//CheckValid is
func (s *SealosInstaller) CheckValid() {
	//hosts := append(Masters, Nodes...)
	// 所有master节点
	//masters := append(Masters, ParseIPs(MasterIPs)...)
	// 所有node节点
	//nodes := append(Nodes, ParseIPs(NodeIPs)...)
	//hosts := append(masters, nodes...)
	var hosts = append(s.Masters, s.Nodes...)
	if len(s.Hosts) == 0 && len(hosts) == 0 {
		s.Print("Fail")
		logger.Error("hosts not allow empty")
		os.Exit(1)
	}
	if SSHConfig.User == "" {
		s.Print("Fail")
		logger.Error("user not allow empty")
		os.Exit(1)
	}
	dict := make(map[string]bool)
	var errList []string
	for _, h := range s.Hosts {
		hostname := SSHConfig.CmdToString(h, "hostname", "") //获取主机名
		if hostname == "" {
			logger.Error("[%s] ------------ check error", h)
			os.Exit(1)
		} else {
			SetHosts(h, hostname)
			if _, ok := dict[hostname]; !ok {
				dict[hostname] = true //不冲突, 主机名加入字典
			} else {
				logger.Error("duplicate hostnames is not allowed")
				os.Exit(1)
			}
			logger.Info("[%s]  ------------ check ok", h)
		}
		if s.Network == net.CILIUM {
			if err := SSHConfig.CmdAsync(h, "uname -r | grep 5 | awk -F. '{if($2>3)print \"ok\"}' | grep ok && exit 0 || exit 1"); err != nil {
				logger.Error("[%s] ------------ check kernel version  < 5.3", h)
				os.Exit(1)
			}
			if err := SSHConfig.CmdAsync(h, "mount bpffs -t bpf /sys/fs/bpf && mount | grep /sys/fs/bpf && exit 0 || exit 1"); err != nil {
				logger.Error("[%s] ------------ mount  bpffs err", h)
				os.Exit(1)
			}
		}

		// version >= 1.20 , Add prefight for containerd
		if For120(Version) {
			// for containerd. if docker exist ; exit frist.

			dockerExist := SSHConfig.CmdToString(h, "command -v dockerd &> /dev/null && echo yes || :", "")
			if dockerExist == "yes" {
				errList = append(errList, h)
			}
		}
	}

	if len(errList) >= 1 {
		logger.Error(`docker exist error when kubernetes version >= 1.20.
sealos install kubernetes version >= 1.20 use containerd cri instead. 
please uninstall docker on [%s]. For example run on centos7: "yum remove docker-ce containerd-io -y",  
see details:  https://github.com/fanux/sealos/issues/582
					`, errList)
		os.Exit(-1)
	}
}
