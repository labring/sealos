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
	"time"

	"k8s.io/client-go/kubernetes"

	"github.com/fanux/sealos/k8s"
	"github.com/fanux/sealos/pkg/logger"
)

type SealosUpgrade struct {
	SealConfig
	NewVersion   string
	NewPkgURL    string
	IPtoHostName map[string]string
	Client       *kubernetes.Clientset
}

var (
	upgradeSealos = &SealosUpgrade{}
)

func NewUpgrade(version, pkgURL string) *SealosUpgrade {
	u := upgradeSealos
	u.NewVersion = version
	u.NewPkgURL = pkgURL
	// add ip -> hostname
	u.SetIPtoHostName()
	var err error
	u.Client, err = k8s.NewClient(k8s.KubeDefaultConfigPath, nil)
	if err != nil {
		logger.Error("get k8s.NewClient err: ", err)
		os.Exit(1)
	}
	return u
}

func ExitUpgradeCase(version, pkgURL, cfgFile string) error {
	if pkgURL == "" || version == "" {
		return fmt.Errorf("version or pkg-url is required, Exit")
	}
	if pkgURLCheck(pkgURL) {
		return fmt.Errorf("pkgurl %s check err, Exit", pkgURL)
	}
	if !FileExist(k8s.KubeDefaultConfigPath) {
		return fmt.Errorf("KubeDefaultConfigPath %s is not exist, Exit", k8s.KubeDefaultConfigPath)
	}

	if err := upgradeSealos.Load(cfgFile); err != nil {
		upgradeSealos.ShowDefaultConfig()
		return err
	}
	return CanUpgradeByNewVersion(version, Version)
}

func (u *SealosUpgrade) SetUP() {
	u.SendPackage()
	u.UpgradeMaster0()
	if len(u.Masters) > 1 {
		u.UpgradeOtherMaster()
	}
	if len(u.Nodes) >= 1 {
		u.UpgradeNodes()
	}
	// store latest version and pkgUrl
	Version = u.NewVersion
	PkgURL = u.NewPkgURL
}

// UpgradeMaster0 is upgrade master first.
func (u *SealosUpgrade) UpgradeMaster0() {
	logger.Info("UpgradeMaster0")
	hostname := u.GetHostNamesFromIps(u.Masters[:1])
	u.upgradeNodes(hostname, true)
}

// UpgradeNodes is upgrade nodes.
func (u *SealosUpgrade) UpgradeNodes() {
	logger.Info("UpgradeNodes")
	hostnames := u.GetHostNamesFromIps(u.Nodes)
	u.upgradeNodes(hostnames, false)
}

// UpgradeOtherMaster is upgrade other master.
func (u *SealosUpgrade) UpgradeOtherMaster() {
	logger.Info("UpgradeOtherMasters")
	hostnames := u.GetHostNamesFromIps(u.Masters[1:])
	u.upgradeNodes(hostnames, true)
}

func (u *SealosUpgrade) upgradeNodes(hostnames []string, isMaster bool) {
	wg := NewPool(2)
	var err error
	for _, hostname := range hostnames {
		wg.Add(1)
		go func(node string) {
			defer wg.Done()
			ip := u.GetIPByHostname(node)
			// drain worker node is too danger for prod use; do not drain nodes if worker nodes~
			if isMaster {
				logger.Info("[%s] first: to drain master node %s", ip, node)
				cmdDrain := fmt.Sprintf(`kubectl drain %s --ignore-daemonsets --delete-local-data`, node)
				err := SSHConfig.CmdAsync(u.Masters[0], cmdDrain)
				if err != nil {
					logger.Error("kubectl drain %s  err: %v", node, err)
				}
			} else {
				logger.Info("first: to print upgrade node %s", node)
			}

			// second to exec kubeadm upgrade node
			logger.Info("[%s] second: to exec kubeadm upgrade node on %s", ip, node)
			var cmdUpgrade string
			if ip == u.Masters[0] {
				cmdUpgrade = fmt.Sprintf("kubeadm upgrade apply --certificate-renewal=false  --yes %s", u.NewVersion)
				err = SSHConfig.CmdAsync(ip, cmdUpgrade)
				if err != nil {
					// master1 upgrade failed exit.
					logger.Error("kubeadm upgrade err: ", err)
					os.Exit(1)
				}
			} else {
				cmdUpgrade = "kubeadm upgrade node --certificate-renewal=false"
				err = SSHConfig.CmdAsync(ip, cmdUpgrade)
				if err != nil {
					logger.Error("kubeadm upgrade err: ", err)
				}
			}

			// third to restart kubelet
			logger.Info("[%s] third: to restart kubelet on %s", ip, node)
			err = SSHConfig.CmdAsync(ip, "systemctl daemon-reload && systemctl restart kubelet")
			if err != nil {
				logger.Error("systemctl daemon-reload && systemctl restart kubelet err: ", err)
			}

			// fourth to judge nodes is ready
			time.Sleep(time.Second * 10)
			k8sNode, _ := k8s.GetNodeByName(u.Client, node)
			if k8s.IsNodeReady(*k8sNode) {
				logger.Info("[%s] fourth:  %s nodes is ready", ip, node)

				// fifth to uncordon node
				err = k8s.CordonUnCordon(u.Client, node, false)
				if err != nil {
					logger.Error(`k8s.CordonUnCordon err: %s, \n After upgrade,  please run "kubectl uncordon %s" to enable Scheduling`, err, node)
				}
				logger.Info("[%s] fifth: to uncordon node, 10 seconds to wait for %s uncordon", ip, node)
			} else {
				logger.Error("fourth:  %s nodes is not ready, please check the nodes logs to find out reason", node)
			}
		}(hostname)
	}
	wg.Wait()
}

func (u *SealosUpgrade) SetIPtoHostName() {
	all := append(u.Masters, u.Nodes...)
	u.IPtoHostName = make(map[string]string, len(all))
	for _, node := range all {
		hostname := SSHConfig.CmdToString(node, "hostname", "")
		u.IPtoHostName[node] = hostname
	}
}

func (u *SealosUpgrade) GetHostNamesFromIps(ips []string) []string {
	if len(ips) == 0 {
		return ips
	}
	var hostnames []string
	for _, ip := range ips {
		if hostname, ok := u.IPtoHostName[ip]; ok {
			hostnames = append(hostnames, hostname)
		}
	}
	return hostnames
}

func (u *SealosUpgrade) GetIPByHostname(host string) string {
	for nip, hostname := range u.IPtoHostName {
		if host == hostname {
			return nip
		}
	}
	return ""
}

/*
kubeadm upgrade apply 做了以下工作：

	检查你的集群是否处于可升级状态:

		API 服务器是可访问的
		所有节点处于 Ready 状态
		控制面是健康的

	强制执行版本 skew 策略。
	确保控制面的镜像是可用的或可拉取到服务器上。
	升级控制面组件或回滚（如果其中任何一个组件无法启动）。
	应用新的 kube-dns 和 kube-proxy 清单，并强制创建所有必需的 RBAC 规则。
	如果旧文件在 180 天后过期，将创建 API 服务器的新证书和密钥文件并备份旧文件。

kubeadm upgrade node 在其他控制平节点上执行以下操作：

	从集群中获取 kubeadm ClusterConfiguration。
	可选地备份 kube-apiserver 证书。
	升级控制平面组件的静态 Pod 清单。
	为本节点升级 kubelet 配置
	kubeadm upgrade node 在工作节点上完成以下工作：

从集群取回 kubeadm ClusterConfiguration。
	为本节点升级 kubelet 配置

*/
