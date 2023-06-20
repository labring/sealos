// Copyright © 2021 Alibaba Group Holding Ltd.
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

package exec

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func ExecutableFilePath(name string) string {
	ex, _ := os.Executable()
	exPath := filepath.Dir(ex)
	return filepath.Join(exPath, name)
}

func ExecutableFileArch(path string) string {
	fileCmd := fmt.Sprintf("file %s", path)
	out := BashEval(fileCmd)
	arm64 := []string{"aarch64", "arm64"}
	amd64 := []string{"x86-64", "x86_64"}

	for _, a := range arm64 {
		if strings.Contains(out, a) {
			return "arm64"
		}
	}
	for _, a := range amd64 {
		if strings.Contains(out, a) {
			return "amd64"
		}
	}
	return ""
}

// FetchSealosAbsPath 获取sealos绝对路径
func FetchSealosAbsPath() string {
	ex, _ := os.Executable()
	exPath, _ := filepath.Abs(ex)
	return exPath
}
