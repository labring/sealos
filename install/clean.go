package install

import (
	"fmt"
	"github.com/fanux/sealos/ipvs"
	"github.com/wonderivan/logger"
	"os"
	"strings"
	"sync"
)

//BuildClean is
func BuildClean(deleteNodes, deleteMasters []string) {
	i := &SealosInstaller{}
	masters := ParseIPs(MasterIPs)
	nodes := ParseIPs(NodeIPs)
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
	if len(deleteNodes) == 0 && len(deleteMasters) == 0 {
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
	}
end:
	if len(i.Masters) == 0 && len(i.Nodes) == 0 {
		os.Exit(-1)
	}
	i.CheckValid()
	i.Clean()
}

//CleanCluster is
func (s *SealosInstaller) Clean() {
	var wg sync.WaitGroup
	//s 是要删除的数据
	//全局是当前的数据
	if len(s.Nodes) > 0 {
		//1. 再删除nodes
		for _, node := range s.Nodes {
			wg.Add(1)
			go func(node string) {
				defer wg.Done()
				cleanNode(node)
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
				cleanMaster(master)
			}(master)
		}
		wg.Wait()
	}

}

func cleanNode(node string) {
	clean(node)
	logger.Debug("clean node in master")
	if len(MasterIPs) > 0 {
		hostname := isHostName(MasterIPs[0], node)
		cmd := "kubectl delete node %s"
		SSHConfig.Cmd(MasterIPs[0], fmt.Sprintf(cmd, strings.TrimSpace(hostname)))
	}
	//remove node
	NodeIPs = SliceRemoveStr(NodeIPs, node)
}

func cleanMaster(master string) {
	clean(master)
	logger.Debug("clean node in master")
	MasterIPs = SliceRemoveStr(MasterIPs, master)
	if len(MasterIPs) > 0 {
		hostname := isHostName(MasterIPs[0], master)
		cmd := "kubectl delete node %s"
		SSHConfig.Cmd(MasterIPs[0], fmt.Sprintf(cmd, strings.TrimSpace(hostname)))
	}
	//清空所有的nodes的数据
	yaml := ipvs.LvsStaticPodYaml(VIP, MasterIPs, "")
	var wg sync.WaitGroup
	for _, node := range NodeIPs {
		wg.Add(1)
		go func(node string) {
			defer wg.Done()
			SSHConfig.Cmd(node, "sleep 6")
			SSHConfig.Cmd(node, "rm -rf  /etc/kubernetes/manifests/kube-sealyun-lvscare*")
			SSHConfig.Cmd(node, "echo \""+yaml+"\" > /etc/kubernetes/manifests/kube-sealyun-lvscare.yaml")
		}(node)
	}
	wg.Wait()

}

func clean(host string) {
	cmd := "kubeadm reset -f && modprobe -r ipip  && lsmod"
	SSHConfig.Cmd(host, cmd)
	cmd = "rm -rf ~/.kube/ && rm -rf /etc/kubernetes/"
	SSHConfig.Cmd(host, cmd)
	cmd = "rm -rf /etc/systemd/system/kubelet.service.d && rm -rf /etc/systemd/system/kubelet.service"
	SSHConfig.Cmd(host, cmd)
	cmd = "rm -rf /usr/bin/kube* && rm -rf /usr/bin/crictl"
	SSHConfig.Cmd(host, cmd)
	cmd = "rm -rf /etc/cni && rm -rf /opt/cni"
	SSHConfig.Cmd(host, cmd)
	cmd = "rm -rf /var/lib/etcd && rm -rf /var/etcd"
	SSHConfig.Cmd(host, cmd)
	cmd = fmt.Sprintf("sed -i \"/%s/d\" /etc/hosts ", ApiServer)
	SSHConfig.Cmd(host, cmd)
	cmd = fmt.Sprint("rm -rf ~/kube")
	SSHConfig.Cmd(host, cmd)
}
