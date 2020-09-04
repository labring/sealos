package install

import (
	"github.com/fanux/sealos/k8s"
	"github.com/wonderivan/logger"
	"os"
	"sync"
)

type ExecFlag struct {
	Dst      string
	Src      string
	Cmd      string
	Label    string
	ExecNode []string
	// map["hostname"] -> ip
	Nodes map[string]string
	SealConfig
}

var (
	Dst         string
	Src         string
	ExecCommand string
	Label       string
	ExecNode    []string
)

func GetExecFlag() *ExecFlag {
	e := &ExecFlag{}
	if !FileExist(k8s.KubeDefaultConfigPath) {
		logger.Error("file %s is not exist", k8s.KubeDefaultConfigPath)
		os.Exit(ErrorExitOSCase)
	}
	err := e.Load("")
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
	e.ExecNode = ExecNode

	// if use label， we need to re-init ExecNode which Flag --node is not set，
	// we must put all nodes to ExecNode. so we can map the ip and hostname.
	if e.IsUseLabeled() && !e.IsUseNode() {
		ExecNode = append(ExecNode, MasterIPs...)
		ExecNode = append(ExecNode, NodeIPs...)
	}
	// make to create non-nil map， nil map assign will panic
	e.Nodes = make(map[string]string, len(ExecNode))
	for _, node := range ExecNode {
		hostname := SSHConfig.CmdToString(node, "hostname", "")
		e.Nodes[hostname] = node
	}
	return e
}

// IsUseLabeled return true when is labeled
func (e *ExecFlag) IsUseLabeled() bool {
	return e.Label != ""
}

// IsUseCmd return true when you want to exec cmd
func (e *ExecFlag) IsUseCmd() bool {
	return e.Cmd != ""
}

// IsUseCmd return true when you want to copy file
func (e *ExecFlag) IsUseCopy() bool {
	return FileExist(e.Src) && e.Dst != ""
}

// IsUseNode return true when is use --node
func (e *ExecFlag) IsUseNode() bool {
	return len(e.ExecNode) != 0
}

// Copy is cp src file to dst file
func (e *ExecFlag) Copy() {
	// this case when use by label . we need a flag to set the --node is not used, in case of running twice By label
	if e.IsUseNode() && !e.IsUseLabeled() {
		e.copyByNode()
	}
	if e.IsUseLabeled() {
		err := e.copyByLabel()
		if err != nil {
			logger.Error("copyByLabel err: ", err)
			os.Exit(ErrorExitOSCase)
		}
	}
}

// Exec is cp src file to dst file
func (e *ExecFlag) Exec() {
	// this case when use by label . we need a flag to set the --node is not used, in case of running twice By label
	if e.IsUseNode() && !e.IsUseLabeled() {
		e.execByNode()
	}
	if e.IsUseLabeled() {
		err := e.execByLabel()
		if err != nil {
			logger.Error("execByLabel err: ", err)
			os.Exit(ErrorExitOSCase)
		}
	}
}

// copyByNode is cp src file to dst file
func (e *ExecFlag) copyByNode() {
	var wg sync.WaitGroup
	for _, n := range e.Nodes {
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

// execByNode is exec cmd in Node
func (e *ExecFlag) execByNode() {
	var wg sync.WaitGroup
	for _, n := range e.Nodes {
		wg.Add(1)
		go func(node string) {
			defer wg.Done()
			CmdWorkSpace(node, e.Cmd, TMPDIR)
		}(n)
	}
	wg.Wait()
}

func (e *ExecFlag) getNodesByLabel() ([]string, error) {
	k8sClient, err := k8s.NewClient(k8s.KubeDefaultConfigPath, nil)
	if err != nil {
		return nil, err
	}
	return k8s.GetNodeByLabel(k8sClient, e.Label)
}

// execByNode is exec cmd by Node
func (e *ExecFlag) execByLabel() error {
	hosts, err := e.getNodesByLabel()
	if err != nil {
		return err
	}
	for _, hostname := range hosts {
		// logger.Info(hostname)
		if node, ok := e.Nodes[hostname]; ok {
			CmdWorkSpace(node, e.Cmd, TMPDIR)
		}
	}
	return nil
}

// copyByNode is copy file by label
func (e *ExecFlag) copyByLabel() error {
	hosts, err := e.getNodesByLabel()
	if err != nil {
		return err
	}
	for _, hostname := range hosts {
		// 说明这个是需要操作的。
		if node, ok := e.Nodes[hostname]; ok {
			// 存在就直接跳过。 不存在才执行
			if SSHConfig.IsFileExist(node, e.Dst) {
				logger.Info("[%s] is exist on remote host [%s].skip...", e.Dst, node)
				continue
			}
			SSHConfig.CopyLocalToRemote(node, e.Src, e.Dst)
		}
	}
	return nil
}
