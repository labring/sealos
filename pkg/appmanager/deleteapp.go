package appmanager

import (
	"fmt"
	"github.com/fanux/sealos/install"
	"github.com/wonderivan/logger"
	"os"
)

type DeleteFlags struct {
	Config     string
	PkgURL     string
	WorkDir    string
	CleanForce bool
}

func GetDeleteFlags(appUrl string) *DeleteFlags {
	return &DeleteFlags{
		Config:     install.PackageConfig,
		WorkDir:    install.WorkDir,
		PkgURL:     appUrl,
		CleanForce: install.CleanForce,
	}
}

func DeleteApp(flag *DeleteFlags) error {
	//TODO
	c := &install.SealConfig{}
	err := c.Load("")
	if err != nil {
		logger.Error(err)
		c.ShowDefaultConfig()
		os.Exit(0)
	}
	pkgConfig, _ := LoadAppConfig(flag.PkgURL, flag.Config)
	pkgConfig.URL = flag.PkgURL
	pkgConfig.Name = nameFromUrl(flag.PkgURL)
	pkgConfig.Workdir = flag.WorkDir
	pkgConfig.Workspace = fmt.Sprintf("%s/%s", flag.WorkDir, pkgConfig.Name)

	if !flag.CleanForce {
		prompt := fmt.Sprintf("deletew command will del your installed %s App , continue delete (y/n)?", pkgConfig.Name)
		result := install.Confirm(prompt)
		if !result {
			logger.Info("delete  %s App is skip, Exit", pkgConfig.Name)
			os.Exit(-1)
		}
	}

	everyNodesCmd, masterOnlyCmd := NewDeleteCommands(pkgConfig.Cmds)
	masterOnlyCmd.Run(*c, pkgConfig)
	everyNodesCmd.CleanUp(*c, pkgConfig)
	return nil
}

// return command run on every nodes and run only on master node
func NewDeleteCommands(cmds []Command) (Runner, Runner) {
	everyNodesCmd := &RunOnEveryNodes{}
	masterOnlyCmd := &RunOnMaster{}
	for _, c := range cmds {
		switch c.Name {
		case "REMOVE", "STOP":
			everyNodesCmd.Cmd = append(everyNodesCmd.Cmd, c)
		case "DELETE":
			masterOnlyCmd.Cmd = append(masterOnlyCmd.Cmd, c)
		default:
			// logger.Warn("Unknown command:%s,%s", c.Name, c.Cmd)
			// don't care other commands
		}
	}
	return everyNodesCmd, masterOnlyCmd
}
