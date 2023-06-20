// Copyright © 2023 sealos.
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
	"bytes"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

// DiffWithCallback diff with callback function.
// trim strip newer prefix from absolute path.
// filter filter path(after trim function) or fileinfo that matched, it true, then invoke callback.
// callback handle a relative path of file to newer.
func DiffWithCallback(old, newer string,
	trim func(string) string,
	filter func(string, fs.FileInfo) bool,
	callback func(string, fs.FileInfo) error,
) error {
	if trim == nil {
		trim = func(s string) string { return strings.TrimPrefix(s, newer) }
	}
	err := filepath.Walk(newer, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}
		// skip root
		if path == newer {
			return nil
		}
		path = trim(path)
		if filter != nil && filter(path, info) {
			return callback(path, info)
		}
		if info.IsDir() || !IsExist(filepath.Join(old, path)) {
			return callback(path, info)
		}
		same, err := Cmp(filepath.Join(newer, path), filepath.Join(old, path), 0)
		if err != nil {
			return err
		}
		if !same {
			return callback(path, info)
		}
		return nil
	})
	return err
}

func Cmp(src, dest string, chunkSize int) (same bool, err error) {
	if chunkSize == 0 {
		chunkSize = 4 * 1024
	}
	// shortcuts: check file metadata
	stat1, err := os.Stat(src)
	if err != nil {
		return false, err
	}
	stat2, err := os.Stat(dest)
	if err != nil {
		return false, err
	}

	// are inputs are literally the same file?
	if os.SameFile(stat1, stat2) {
		return true, nil
	}

	// do inputs at least have the same size?
	if stat1.Size() != stat2.Size() {
		return false, nil
	}

	// long way: compare contents
	f1, err := os.Open(src)
	if err != nil {
		return false, err
	}
	defer f1.Close()

	f2, err := os.Open(dest)
	if err != nil {
		return false, err
	}
	defer f2.Close()

	b1 := make([]byte, chunkSize)
	b2 := make([]byte, chunkSize)
	for {
		n1, err1 := io.ReadFull(f1, b1)
		n2, err2 := io.ReadFull(f2, b2)

		// https://pkg.go.dev/io#Reader
		// > Callers should always process the n > 0 bytes returned
		// > before considering the error err. Doing so correctly
		// > handles I/O errors that happen after reading some bytes
		// > and also both of the allowed EOF behaviors.

		if !bytes.Equal(b1[:n1], b2[:n2]) {
			return false, nil
		}

		if (err1 == io.EOF && err2 == io.EOF) || (err1 == io.ErrUnexpectedEOF && err2 == io.ErrUnexpectedEOF) {
			return true, nil
		}

		// some other error, like a dropped network connection or a bad transfer
		if err1 != nil {
			return false, err1
		}
		if err2 != nil {
			return false, err2
		}
	}
}
