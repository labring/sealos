/*
Copyright 2022 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package boot

import (
	"fmt"
	"os"

	"github.com/fanux/sealos/pkg/utils/logger"
)

var Debug bool
var ConfigDir string
var ConfigFile string
var ShowPatch bool
var ConfigFilePath string

// initConfig reads in config file and ENV variables if set.
func initConfig() {
	ConfigFilePath = ConfigDir + ConfigFile
	logger.Cfg(Debug, ConfigDir, "sealos", ShowPatch)
}

func initRootDirectory() error {
	var rootDirs = []string{
		ConfigDir,
	}
	for _, dir := range rootDirs {
		err := os.MkdirAll(dir, 0755)
		if err != nil {
			return fmt.Errorf("failed to mkdir %s, err: %s", dir, err)
		}
	}
	return nil
}

func OnBootOnDie() {
	if err := initRootDirectory(); err != nil {
		panic(1)
	}
	initConfig()
}
