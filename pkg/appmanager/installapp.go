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
	"bytes"
	"fmt"
	"io/ioutil"

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

func GetInstallFlags(appURL string) *InstallFlags {
	return &InstallFlags{
		Config:  install.PackageConfig,
		PkgURL:  appURL,
		WorkDir: install.WorkDir,
		Values:  install.Values,
	}
}

func InstallApp(flag *InstallFlags, cfgFile string) error {
	c := &install.SealConfig{}
	if err := c.Load(cfgFile); err != nil {
		logger.Error("%s", err)
		c.ShowDefaultConfig()
		os.Exit(0)
	}

	pkgConfig, err := LoadAppConfig(flag.PkgURL, flag.Config)
	if err != nil {
		logger.Error("Load App config from tarball err: ", err)
		os.Exit(0)
	}
	pkgConfig.URL = flag.PkgURL
	pkgConfig.Name = nameFromURL(flag.PkgURL)
	pkgConfig.Workdir = flag.WorkDir
	pkgConfig.Workspace = fmt.Sprintf("%s/%s", flag.WorkDir, pkgConfig.Name)
	s, err := getValuesContent(flag.Values)
	if err != nil {
		logger.Error("get values err:", err)
		os.Exit(-1)
	}
	pkgConfig.ValuesContent = s
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

// getValuesContent is
func getValuesContent(s string) (valuesContent []byte, err error) {
	if s == "-" {
		// deal with stdin
		return ReadFromStdin()
	} else if s == "" {
		// use default and do nothing
		return nil, nil
	} else {
		// use -f file
		return ioutil.ReadFile(s)
	}
}

// ReadFromStdin is
func ReadFromStdin() (bt []byte, err error) {
	var b bytes.Buffer
	_, err = b.ReadFrom(os.Stdin)
	if err != nil {
		return nil, err
	}
	return b.Bytes(), nil
}
