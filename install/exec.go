package install

import (
	"os"
	"strings"
	"sync"

	"github.com/fanux/sealos/k8s"
	"github.com/wonderivan/logger"
)

type ExecFlag struct {
	Dst      string
	Src      string
	Cmd      string
	Label    string
	ExecNode []string
	SealConfig
}

var (
	Dst         string
	Src         string
	ExecCommand string
	Label       string
	ExecNode    []string
)

func GetExecFlag(cfgFile string) *ExecFlag {
	e := &ExecFlag{}
	if !FileExist(k8s.KubeDefaultConfigPath) {
		logger.Error("file %s is not exist", k8s.KubeDefaultConfigPath)
		os.Exit(ErrorExitOSCase)
	}
	err := e.Load(cfgFile)
	if err != nil {
		logger.Error(err)
		e.ShowDefaultConfig()
		os.Exit(0)
	}
	e.Dst = Dst
	e.Src = Src
	// logger.Info("get label", Label)
	e.Label = Label
	e.Cmd = ExecCommand

	// change labels ==> to ip
	k8sClient, err := k8s.NewClient(k8s.KubeDefaultConfigPath, nil)
	if err != nil {
		logger.Error("get k8s client err: ", err)
		os.Exit(ErrorExitOSCase)
	}
	e.ExecNode, err = k8s.TransToIP(k8sClient, Label, ExecNode)
	if err != nil {
		logger.Error("get ips err: ", err)
		os.Exit(ErrorExitOSCase)
	}
	e.transToIps()
	return e
}

// transToIps is trans ip to ip:port
func (e *ExecFlag) transToIps() {
	var ips []string
	if !e.IsUseNode() {
		return
	}
	all := append(MasterIPs, NodeIPs...)
	for _, v := range all {
		for _, node := range e.ExecNode {
			if strings.Contains(v, node) {
				ips = append(ips, v)
			}
		}
	}
	e.ExecNode = ips
}

// IsUseLabeled return true when is labeled
func (e *ExecFlag) IsUseLabeled() bool {
	return e.Label != ""
}

// IsUseCmd return true when you want to exec cmd
func (e *ExecFlag) IsUseCmd() bool {
	return e.Cmd != ""
}

// IsUseCopy return true when you want to copy file
func (e *ExecFlag) IsUseCopy() bool {
	return FileExist(e.Src) && e.Dst != ""
}

// IsUseNode return true when is use --node
func (e *ExecFlag) IsUseNode() bool {
	return len(e.ExecNode) != 0
}

// Copy is cp src file to dst file
func (e *ExecFlag) Copy() {
	e.copyByNodeIp()
}

// Exec is cp src file to dst file
func (e *ExecFlag) Exec() {
	e.execByNodeIp()
}

// copyByNodeIp is cp src file to dst file
func (e *ExecFlag) copyByNodeIp() {
	var wg sync.WaitGroup
	for _, n := range e.ExecNode {
		wg.Add(1)
		go func(node string) {
			defer wg.Done()
			// 存在就直接跳过。 不存在才执行
			if SSHConfig.IsFileExist(node, e.Dst) {
				logger.Info("[%s] is exist on remote host [%s]. skip...", e.Dst, node)
				return
			}
			SSHConfig.CopyLocalToRemote(node, e.Src, e.Dst)
		}(n)
	}
	wg.Wait()
}

// execByNodeIp is exec cmd in Node
func (e *ExecFlag) execByNodeIp() {
	var wg sync.WaitGroup
	for _, n := range e.ExecNode {
		wg.Add(1)
		go func(node string) {
			defer wg.Done()
			CmdWorkSpace(node, e.Cmd, TMPDIR)
		}(n)
	}
	wg.Wait()
}
