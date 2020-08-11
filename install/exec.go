package install

import (
	"github.com/fanux/sealos/k8s"
	"sync"
)

type ExecFlag struct {
	Dst   string
	Src   string
	Cmd   string
	Label string
	Nodes []string
	SealConfig
}

func GetExecFlag() *ExecFlag {
	return &ExecFlag{}
}

// IsLabeled return true when is not labeled
func (e *ExecFlag) IsLabeled() bool {
	return e.Label == ""
}

func (e *ExecFlag) IsNode() bool {
	return e.Nodes == nil
}

// Copy is cp src file to dst file
func (e *ExecFlag) Copy() {

}

// Exec is cp src file to dst file
func (e *ExecFlag) Exec() {

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

func (e *ExecFlag) getNodesByLabel() error {
	k8sClient, err := k8s.NewClient(k8s.KubeDefaultConfigPath, nil)
	if err != nil {
		return err
	}
	nodes, err := k8s.GetNodeByLabel(k8sClient, e.Label)
	if err != nil {
		return err
	}
	e.Nodes = nodes
	return nil
}

// execByNode is exec cmd in Node
func (e *ExecFlag) execByLabel() {

}
