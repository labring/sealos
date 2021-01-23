// Copyright © 2019 NAME HERE <EMAIL ADDRESS>
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

package cmd

import (
	"fmt"
	extver "github.com/linuxsuren/cobra-extension/version"
	"runtime"
	"strings"
)

func init() {
	// it's possible to have multiple choices for users to choose GitHub or aliyun as their download source
	// see also https://github.com/LinuxSuRen/cobra-extension/issues/6
	const name = "sealos"
	verCmd := extver.NewVersionCmd("fanux", name, name, func(ver string) string {
		if strings.HasPrefix(ver, "v") {
			ver = strings.TrimPrefix(ver, "v")
		}
		return fmt.Sprintf("https://github.com/fanux/sealos/releases/download/v%s/%s_%s_%s_%s.tar.gz",
			ver, name, ver, runtime.GOOS, runtime.GOARCH)
	})
	rootCmd.AddCommand(verCmd)
}
