package install

import (
	"github.com/fanux/sealos/k8s"
	"github.com/wonderivan/logger"
	"os"
	"sync"
)

type ExecFlag struct {
	Dst   string
	Src   string
	Cmd   string
	Label string
	// map["hostname"] -> ip
	Nodes map[string]string
	ExecNode bool
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
	logger.Info("get label", Label)
	e.Label = Label
	e.Cmd = ExecCommand
	// make 创建一个非nil的map， nil map assign 会报错
	e.Nodes = make(map[string]string, len(ExecNode))
	if len(ExecNode) == 0 {
		e.ExecNode = true
		ExecNode = append(ExecNode, MasterIPs...)
		ExecNode = append(ExecNode, NodeIPs...)
	}
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
	return e.Src != "" && e.Dst != ""
}

// IsUseNode return true when is use --node
func (e *ExecFlag) IsUseNode() bool {
	return len(e.Nodes) != 0
}

// Copy is cp src file to dst file
func (e *ExecFlag) Copy() {
	if e.IsUseNode() && !e.ExecNode {
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
	if e.IsUseNode() && !e.ExecNode {
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
			SSHConfig.Copy(node, e.Src, e.Dst)
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
		logger.Info(hostname)
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
			SSHConfig.Copy(node, e.Src, e.Dst)
		}
	}
	return nil
}