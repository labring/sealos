// Copyright © 2026 sealos.
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

package standalone

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strconv"
)

type replacement struct {
	Source       string
	Destination  string
	Mode         os.FileMode
	Backup       string
	OriginalMode os.FileMode
	Existed      bool
}

// Back up the complete set before stopping kubelet. The inventory also allows
// manual recovery after a process or host failure.
func backupReplacements(dir string, files []replacement) error {
	backupDir := filepath.Join(dir, "files")
	if err := os.Mkdir(backupDir, 0o700); err != nil {
		return err
	}
	for i := range files {
		file := &files[i]
		info, err := os.Lstat(file.Destination)
		if os.IsNotExist(err) {
			continue
		}
		if err != nil {
			return err
		}
		if !info.Mode().IsRegular() {
			return fmt.Errorf("replacement destination is not a regular file: %s", file.Destination)
		}
		file.Existed = true
		file.OriginalMode = info.Mode().Perm()
		file.Backup = filepath.Join(backupDir, strconv.Itoa(i))
		if err := copyAtomic(file.Destination, file.Backup, 0o600); err != nil {
			return err
		}
	}
	return writeJSON(filepath.Join(dir, "files.json"), files)
}

func replaceFiles(files []replacement) (attempted int, err error) {
	for i, file := range files {
		if err := copyAtomic(file.Source, file.Destination, file.Mode); err != nil {
			return i + 1, err
		}
	}
	return len(files), nil
}

func restoreFiles(files []replacement) error {
	var result error
	for _, file := range slices.Backward(files) {
		var err error
		if file.Existed {
			err = copyAtomic(file.Backup, file.Destination, file.OriginalMode)
		} else {
			err = os.Remove(file.Destination)
			if os.IsNotExist(err) {
				err = nil
			}
		}
		if err != nil {
			result = errors.Join(result, fmt.Errorf("restore %s: %w", file.Destination, err))
		}
	}
	return result
}
