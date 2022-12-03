/*
Copyright 2022 fengxsong@outlook.com

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

package ssh

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
)

func CopyDir(sshClient Interface, host, src, dest string, filter func(fs.DirEntry) bool) error {
	entries, err := os.ReadDir(src)
	if err != nil {
		return fmt.Errorf("failed to read dir entries %s", err)
	}
	// Copy empty dir anyway
	if len(entries) == 0 {
		return sshClient.Copy(host, src, dest)
	}
	for _, f := range entries {
		if filter == nil || filter(f) {
			err = sshClient.Copy(host, filepath.Join(src, f.Name()), filepath.Join(dest, f.Name()))
			if err != nil {
				return fmt.Errorf("failed to copy entry %v", err)
			}
		}
	}
	return nil
}
