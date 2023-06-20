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

package file

import (
	"os"
	"path/filepath"
)

type atomicFileWriter struct {
	f    *os.File
	path string
	perm os.FileMode
}

func (a *atomicFileWriter) close() (err error) {
	if err = a.f.Sync(); err != nil {
		err := a.f.Close()
		if err != nil {
			return err
		}
		return err
	}
	if err := a.f.Close(); err != nil {
		return err
	}
	if err := os.Chmod(a.f.Name(), a.perm); err != nil {
		return err
	}
	return os.Rename(a.f.Name(), a.path)
}

func newAtomicFileWriter(path string, perm os.FileMode) (*atomicFileWriter, error) {
	tmpFile, err := MkTmpFile(filepath.Dir(path))
	if err != nil {
		return nil, err
	}
	return &atomicFileWriter{f: tmpFile, path: path, perm: perm}, nil
}

func AtomicWriteFile(filepath string, data []byte, perm os.FileMode) (err error) {
	afw, err := newAtomicFileWriter(filepath, perm)
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			CleanFile(afw.f)
		}
	}()
	if _, err = afw.f.Write(data); err != nil {
		return
	}
	err = afw.close()
	return
}
