package appmanager

import (
	"github.com/fanux/sealos/install"
	"github.com/fanux/sealos/pkg/logger"
	"os"
)

type InstallFlags struct {
	Envs    []string
	Config  string
	Values  string
	PkgURL  string
	WorkDir string
}

func InstallApp(flag *InstallFlags) error {
	c := &install.SealConfig{}
	err := c.Load("")
	if err != nil {
		logger.Error("%s", err)
		c.ShowDefaultConfig()
		os.Exit(0)
	}

	pkgConfig, _ := LoadAppConfig(flag.PkgURL, flag.WorkDir)
	pkgConfig.URL = flag.PkgURL
	pkgConfig.Name = nameFromUrl(flag.PkgURL)
	pkgConfig.Workdir = install.Workdir

	everyNodesCmd, masterOnlyCmd := NewInstallCommands(pkgConfig.Cmds)
	everyNodesCmd.Send(*c, pkgConfig)
	everyNodesCmd.Run(*c, pkgConfig)
	masterOnlyCmd.Send(*c, pkgConfig)
	masterOnlyCmd.Run(*c, pkgConfig)
	return nil
}

// return command run on every nodes and run only on master node
func NewInstallCommands(cmds []Command) (Runner, Runner) {
	everyNodesCmd := &RunOnEveryNodes{}
	masterOnlyCmd := &RunOnMaster{}
	for _, c := range cmds {
		switch c.Name {
		case "START", "LOAD":
			everyNodesCmd.Cmd = append(everyNodesCmd.Cmd, c)
		case "APPLY":
			masterOnlyCmd.Cmd = append(masterOnlyCmd.Cmd, c)
		default:
			// logger.Warn("Unknown command:%s,%s", c.Name, c.Cmd)
			// don't care other commands
		}
	}
	return everyNodesCmd, masterOnlyCmd
}
