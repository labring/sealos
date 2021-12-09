package install

import (
	"fmt"
	"github.com/fanux/sealos/ipvs"
	ssh_cmd "github.com/fanux/sealos/pkg/sshcmd/cmd"
	"github.com/wonderivan/logger"
	"os"
	"strings"
	"sync"
)

type SealosClean struct {
	SealosInstaller
	cleanAll bool
}

//BuildClean is
func BuildClean(deleteNodes, deleteMasters []string) {
	i := &SealosClean{cleanAll: false}
	masters := MasterIPs
	nodes := NodeIPs
	//1. 删除masters
	if len(deleteMasters) != 0 {
		if !CleanForce { // flase
			prompt := fmt.Sprintf("clean command will clean masters [%s], continue clean (y/n)?", strings.Join(deleteMasters, ","))
			result := Confirm(prompt)
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
		if !CleanForce { // flase
			prompt := fmt.Sprintf("clean command will clean nodes [%s], continue clean (y/n)?", strings.Join(deleteNodes, ","))
			result := Confirm(prompt)
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
	if len(deleteNodes) == 0 && len(deleteMasters) == 0 && CleanAll {
		if !CleanForce { // flase
			result := Confirm(`clean command will clean all masters and nodes, continue clean (y/n)?`)
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
		home, _ := os.UserHomeDir()
		cfgPath := home + defaultConfigPath
		ssh_cmd.Cmd("/bin/sh", "-c", "rm -rf "+cfgPath)
	}

}

//CleanCluster is
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
		for _, master := range s.Masters {
			wg.Add(1)
			go func(master string) {
				defer wg.Done()
				s.cleanMaster(master)
			}(master)
		}
		wg.Wait()
	}

}

func (s *SealosClean) cleanNode(node string) {
	clean(node)
	//remove node
	NodeIPs = SliceRemoveStr(NodeIPs, node)
	if !s.cleanAll {
		logger.Debug("clean node in master")
		if len(MasterIPs) > 0 {
			hostname := isHostName(MasterIPs[0], node)
			cmd := "kubectl delete node %s"
			_ = SSHConfig.CmdAsync(MasterIPs[0], fmt.Sprintf(cmd, strings.TrimSpace(hostname)))
		}
	}
}

func (s *SealosClean) cleanMaster(master string) {
	clean(master)
	//remove master
	MasterIPs = SliceRemoveStr(MasterIPs, master)
	if !s.cleanAll {
		logger.Debug("clean node in master")
		if len(MasterIPs) > 0 {
			hostname := isHostName(MasterIPs[0], master)
			cmd := "kubectl delete node %s"
			_ = SSHConfig.CmdAsync(MasterIPs[0], fmt.Sprintf(cmd, strings.TrimSpace(hostname)))
		}
		//清空所有的nodes的数据
		yaml := ipvs.LvsStaticPodYaml(VIP, MasterIPs, LvscareImage)
		var wg sync.WaitGroup
		for _, node := range NodeIPs {
			wg.Add(1)
			go func(node string) {
				defer wg.Done()
				_ = SSHConfig.CmdAsync(node, "rm -rf  /etc/kubernetes/manifests/kube-sealyun-lvscare*")
				_ = SSHConfig.CmdAsync(node, fmt.Sprintf("mkdir -p /etc/kubernetes/manifests && echo '%s' > /etc/kubernetes/manifests/kube-sealyun-lvscare.yaml", yaml))
			}(node)
		}
		wg.Wait()
	}
}

func clean(host string) {
	cmd := "kubeadm reset -f " + vlogToStr()
	_ = SSHConfig.CmdAsync(host, cmd)
	cmd = fmt.Sprintf("sed -i \"/%s/d\" /root/.bashrc ", "kubectl")
	_ = SSHConfig.CmdAsync(host, cmd)
	cmd = "modprobe -r ipip  && lsmod"
	_ = SSHConfig.CmdAsync(host, cmd)
	cmd = "rm -rf ~/.kube/ && rm -rf /etc/kubernetes/"
	_ = SSHConfig.CmdAsync(host, cmd)
	cmd = "rm -rf /etc/systemd/system/kubelet.service.d && rm -rf /etc/systemd/system/kubelet.service"
	_ = SSHConfig.CmdAsync(host, cmd)
	cmd = "rm -rf /usr/bin/kube* && rm -rf /usr/bin/crictl"
	_ = SSHConfig.CmdAsync(host, cmd)
	cmd = "rm -rf /etc/cni && rm -rf /opt/cni"
	_ = SSHConfig.CmdAsync(host, cmd)
	cmd = "rm -rf /var/lib/etcd && rm -rf /var/etcd"
	_ = SSHConfig.CmdAsync(host, cmd)
	cmd = fmt.Sprintf("sed -i \"/%s/d\" /etc/hosts ", ApiServer)
	_ = SSHConfig.CmdAsync(host, cmd)
	cmd = fmt.Sprint("rm -rf ~/kube")
	_ = SSHConfig.CmdAsync(host, cmd)
	//clean pki certs
	cmd = fmt.Sprint("rm -rf /etc/kubernetes/pki")
	_ = SSHConfig.CmdAsync(host, cmd)
}
