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
	"strings"
	"sync"

	v1 "github.com/fanux/sealos/pkg/types/v1"
	"github.com/fanux/sealos/pkg/utils"
	"github.com/fanux/sealos/pkg/utils/ssh"

	"github.com/fanux/sealos/pkg/ipvs"
	"github.com/fanux/sealos/pkg/utils/logger"
)

type SealosClean struct {
	SealosInstaller
	cleanAll bool
}

// BuildClean clean the build resources.
func BuildClean(deleteNodes, deleteMasters []string) {
	i := &SealosClean{cleanAll: false}
	masters := v1.MasterIPs
	nodes := v1.NodeIPs
	//1. 删除masters
	if len(deleteMasters) != 0 {
		if !v1.CleanForce { // false
			prompt := fmt.Sprintf("clean command will clean masters [%s], continue clean (y/n)?", strings.Join(deleteMasters, ","))
			result := utils.Confirm(prompt)
			if !result {
				logger.Debug("clean masters command is skip")
				goto node
			}
		}
		//只清除masters
		i.Masters = deleteMasters
	}

	//2. 删除nodes
node:
	if len(deleteNodes) != 0 {
		if !v1.CleanForce { // flase
			prompt := fmt.Sprintf("clean command will clean nodes [%s], continue clean (y/n)?", strings.Join(deleteNodes, ","))
			result := utils.Confirm(prompt)
			if !result {
				logger.Debug("clean nodes command is skip")
				goto all
			}
		}
		//只清除nodes
		i.Nodes = deleteNodes
	}
	//3. 删除所有节点
all:
	if len(deleteNodes) == 0 && len(deleteMasters) == 0 && v1.CleanAll {
		if !v1.CleanForce { // flase
			result := utils.Confirm(`clean command will clean all masters and nodes, continue clean (y/n)?`)
			if !result {
				logger.Debug("clean all node command is skip")
				goto end
			}
		}
		// 所有master节点
		i.Masters = masters
		// 所有node节点
		i.Nodes = nodes
		i.cleanAll = true
	}
end:
	if len(i.Masters) == 0 && len(i.Nodes) == 0 {
		logger.Warn("clean nodes and masters is empty,please check your args and config.yaml.")
		os.Exit(-1)
	}
	i.CheckValid()
	i.Clean()
	if i.cleanAll {
		logger.Info("if clean all and clean sealos config")
		cfgPath := v1.DefaultConfigPath
		_, _ = utils.Exec("/bin/sh", "-c", "rm -rf "+cfgPath)
	}
}

//Clean clean cluster.
func (s *SealosClean) Clean() {
	var wg sync.WaitGroup
	//s 是要删除的数据
	//全局是当前的数据
	if len(s.Nodes) > 0 {
		//1. 再删除nodes
		for _, node := range s.Nodes {
			wg.Add(1)
			go func(node string) {
				defer wg.Done()
				s.cleanNode(node)
			}(node)
		}
		wg.Wait()
	}
	if len(s.Masters) > 0 {
		//2. 先删除master
		lock := sync.Mutex{}
		for _, master := range s.Masters {
			wg.Add(1)
			go func(master string) {
				lock.Lock()
				defer lock.Unlock()
				defer wg.Done()
				s.cleanMaster(master)
			}(master)
		}
		wg.Wait()
	}
}

func (s *SealosClean) cleanNode(node string) {
	cleanRoute(node)
	clean(node)
	//remove node
	v1.NodeIPs = utils.IPListRemove(v1.NodeIPs, node)
	if !s.cleanAll {
		logger.Debug("clean node in master")
		if len(v1.MasterIPs) > 0 {
			hostname := ssh.HostName(v1.SSHConfig, v1.MasterIPs[0], node)
			cmd := "kubectl delete node %s"
			_ = v1.SSHConfig.CmdAsync(v1.MasterIPs[0], fmt.Sprintf(cmd, strings.TrimSpace(hostname)))
		}
	}
}

func (s *SealosClean) cleanMaster(master string) {
	clean(master)
	//remove master
	v1.MasterIPs = utils.IPListRemove(v1.MasterIPs, master)
	if !s.cleanAll {
		logger.Debug("clean node in master")
		if len(v1.MasterIPs) > 0 {
			hostname := ssh.HostName(v1.SSHConfig, v1.MasterIPs[0], master)
			cmd := "kubectl delete node %s"
			_ = v1.SSHConfig.CmdAsync(v1.MasterIPs[0], fmt.Sprintf(cmd, strings.TrimSpace(hostname)))
		}
		//清空所有的nodes的数据
		yaml := ipvs.LvsStaticPodYaml(v1.VIP, v1.MasterIPs, v1.LvscareImage)
		var wg sync.WaitGroup
		for _, node := range v1.NodeIPs {
			wg.Add(1)
			go func(node string) {
				defer wg.Done()
				_ = v1.SSHConfig.CmdAsync(node, "rm -rf  /etc/kubernetes/manifests/kube-sealyun-lvscare*")
				_ = v1.SSHConfig.CmdAsync(node, fmt.Sprintf("mkdir -p /etc/kubernetes/manifests && echo '%s' > /etc/kubernetes/manifests/kube-sealyun-lvscare.yaml", yaml))
			}(node)
		}
		wg.Wait()
	}
}

func clean(host string) {
	cmd := "kubeadm reset -f " + v1.VLogString()
	_ = v1.SSHConfig.CmdAsync(host, cmd)
	cmd = `sed -i '/kubectl/d;/sealos/d' /root/.bashrc`
	_ = v1.SSHConfig.CmdAsync(host, cmd)
	cmd = "modprobe -r ipip  && lsmod"
	_ = v1.SSHConfig.CmdAsync(host, cmd)
	cmd = "rm -rf ~/.kube/ && rm -rf /etc/kubernetes/"
	_ = v1.SSHConfig.CmdAsync(host, cmd)
	cmd = "rm -rf /etc/systemd/system/kubelet.service.d && rm -rf /etc/systemd/system/kubelet.service"
	_ = v1.SSHConfig.CmdAsync(host, cmd)
	cmd = "rm -rf /usr/bin/kube* && rm -rf /usr/bin/crictl"
	_ = v1.SSHConfig.CmdAsync(host, cmd)
	cmd = "rm -rf /etc/cni && rm -rf /opt/cni"
	_ = v1.SSHConfig.CmdAsync(host, cmd)
	cmd = "rm -rf /var/lib/etcd && rm -rf /var/etcd"
	_ = v1.SSHConfig.CmdAsync(host, cmd)
	cmd = fmt.Sprintf("sed -i \"/%s/d\" /etc/hosts ", v1.APIServer)
	_ = v1.SSHConfig.CmdAsync(host, cmd)
	cmd = "rm -rf ~/kube"
	_ = v1.SSHConfig.CmdAsync(host, cmd)
	//clean pki certs
	cmd = "rm -rf /etc/kubernetes/pki"
	_ = v1.SSHConfig.CmdAsync(host, cmd)
	//clean sealos in /usr/bin/ except exec sealos
	cmd = "ps -ef |grep -v 'grep'|grep sealos >/dev/null || rm -rf /usr/bin/sealos"
	_ = v1.SSHConfig.CmdAsync(host, cmd)
}

func cleanRoute(node string) {
	// clean route
	cmdRoute := fmt.Sprintf("sealos route --host %s", utils.IPFormat(node))
	status := v1.SSHConfig.CmdToString(node, cmdRoute, "")
	if status != "ok" {
		// 删除为 vip创建的路由。
		delRouteCmd := fmt.Sprintf("sealos route del --host %s --gateway %s", v1.VIP, utils.IPFormat(node))
		v1.SSHConfig.CmdToString(node, delRouteCmd, "")
	}
}
