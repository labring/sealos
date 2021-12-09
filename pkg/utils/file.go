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

package utils

import (
	"fmt"
	"os"

	"github.com/fanux/sealos/pkg/utils/logger"
)

const md5sumCmd = "md5sum %s | cut -d\" \" -f1"

func FromLocal(localPath string) string {
	cmd := fmt.Sprintf(md5sumCmd, localPath)
	return BashEval(cmd)
}

func UserHomeDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	return home
}

func FileExist(filename string) bool {
	_, err := os.Stat(filename)
	if !os.IsNotExist(err) {
		if err == nil {
			return true
		}
		logger.Warn(err)
	}
	return false
}
