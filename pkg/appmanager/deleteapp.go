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

package appmanager

import (
	"fmt"
	"os"

	"github.com/fanux/sealos/install"
	"github.com/fanux/sealos/pkg/logger"
)

type DeleteFlags struct {
	Config     string
	PkgURL     string
	WorkDir    string
	CleanForce bool
}

func GetDeleteFlags(appURL string) *DeleteFlags {
	return &DeleteFlags{
		Config:     install.PackageConfig,
		WorkDir:    install.WorkDir,
		PkgURL:     appURL,
		CleanForce: install.CleanForce,
	}
}

func DeleteApp(flag *DeleteFlags, cfgFile string) error {
	//TODO
	c := &install.SealConfig{}
	if err := c.Load(cfgFile); err != nil {
		logger.Error(err)
		c.ShowDefaultConfig()
		os.Exit(0)
	}
	pkgConfig, _ := LoadAppConfig(flag.PkgURL, flag.Config)
	pkgConfig.URL = flag.PkgURL
	pkgConfig.Name = nameFromURL(flag.PkgURL)
	pkgConfig.Workdir = flag.WorkDir
	pkgConfig.Workspace = fmt.Sprintf("%s/%s", flag.WorkDir, pkgConfig.Name)

	if !flag.CleanForce {
		prompt := fmt.Sprintf("delete command will del your installed %s App , continue delete (y/n)?", pkgConfig.Name)
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
