package install

import (
	"fmt"
	"github.com/fanux/sealos/ipvs"
	"github.com/wonderivan/logger"
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
		//只清除masters
		i.Masters = deleteMasters
	}
	//2. 删除nodes
	if len(deleteNodes) != 0 {
		//只清除nodes
		i.Nodes = deleteNodes
	}
	if len(deleteNodes) == 0 && len(deleteMasters) == 0 {
		// 所有master节点
		i.Masters = masters
		// 所有node节点
		i.Nodes = nodes
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
	}
	wg.Wait()
}

func cleanNode(node string) {
	clean(node)
	logger.Debug("clean node in master")
	hostname := SSHConfig.CmdToString(node, "cat /etc/hostname")
	cmd := "kubectl delete node %s"
	if len(MasterIPs) > 0 {
		SSHConfig.Cmd(MasterIPs[0], fmt.Sprintf(cmd, strings.TrimSpace(hostname)))
	}
	//remove node
	NodeIPs = SliceRemoveStr(NodeIPs, node)
}

func cleanMaster(master string) {
	clean(master)
	logger.Debug("clean node in master")
	MasterIPs = SliceRemoveStr(MasterIPs, master)
	hostname := SSHConfig.CmdToString(master, "cat /etc/hostname")
	cmd := "kubectl delete node %s"
	if len(MasterIPs) > 0 {
		SSHConfig.Cmd(MasterIPs[0], fmt.Sprintf(cmd, strings.TrimSpace(hostname)))
	}
	//清空所有的nodes的数据
	yaml := ipvs.LvsStaticPodYaml(VIP, MasterIPs, "")
	var wg sync.WaitGroup
	for _, node := range NodeIPs {
		wg.Add(1)
		go func(node string) {
			defer wg.Done()
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
