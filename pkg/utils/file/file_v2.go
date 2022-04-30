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
	"bufio"
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/pkg/errors"
)

func Filename(f string) string {
	i := strings.LastIndexByte(f, '/')
	return f[i+1:]
}

func IsExist(fileName string) bool {
	if _, err := os.Stat(fileName); err != nil {
		return os.IsExist(err)
	}
	return true
}
func GetFiles(path string) (paths []string, err error) {
	_, err = os.Stat(path)
	if err != nil {
		return
	}
	err = filepath.Walk(path, func(path string, info os.FileInfo, err error) error {
		if info.IsDir() {
			return nil
		}
		paths = append(paths, path)
		return err
	})
	return paths, err
}
func ReadLines(fileName string) ([]string, error) {
	var lines []string
	if !IsExist(fileName) {
		return nil, errors.New("no such file")
	}
	file, err := os.Open(filepath.Clean(fileName))
	if err != nil {
		return nil, err
	}
	defer file.Close()
	br := bufio.NewReader(file)
	for {
		line, _, c := br.ReadLine()
		if c == io.EOF {
			break
		}
		lines = append(lines, string(line))
	}
	return lines, nil
}

func WriteLines(fileName string, lines []string) error {
	var sb strings.Builder
	for _, line := range lines {
		sb.WriteString(line + "\n")
	}
	return WriteFile(fileName, []byte(sb.String()))
}

// ReadAll read file content
func ReadAll(fileName string) ([]byte, error) {
	// step1：check file exist
	if !IsExist(fileName) {
		return nil, fmt.Errorf("path is %s no such file", fileName)
	}
	// step2：open file
	file, err := os.Open(filepath.Clean(fileName))
	if err != nil {
		return nil, err
	}
	defer file.Close()

	// step3：read file content
	content, err := ioutil.ReadFile(filepath.Clean(fileName))
	if err != nil {
		return nil, err
	}

	return content, nil
}

// file ./test/dir/xxx.txt if dir ./test/dir not exist, create it
func MkFileFullPathDir(fileName string) error {
	localDir := filepath.Dir(fileName)
	if err := Mkdir(localDir); err != nil {
		return fmt.Errorf("failed to create local dir %s: %v", localDir, err)
	}
	return nil
}

func Mkdir(dirName string) error {
	return os.MkdirAll(dirName, 0755)
}

func MkDirs(dirs ...string) error {
	if len(dirs) == 0 {
		return nil
	}
	for _, dir := range dirs {
		err := os.MkdirAll(dir, 0755)
		if err != nil {
			return fmt.Errorf("failed to create %s, %v", dir, err)
		}
	}
	return nil
}

func MkTmpdir(dir string) (string, error) {
	tempDir, err := ioutil.TempDir(dir, "DTmp-")
	if err != nil {
		return "", err
	}
	return tempDir, os.MkdirAll(tempDir, 0755)
}

func MkTmpFile(path string) (*os.File, error) {
	return ioutil.TempFile(path, "FTmp-")
}

func WriteFile(fileName string, content []byte) error {
	dir := filepath.Dir(fileName)
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if err = os.MkdirAll(dir, 0755); err != nil {
			return err
		}
	}

	return AtomicWriteFile(fileName, content, 0644)
}

// RecursionCopy is copy
// copy a.txt /var/lib/a.txt
// copy /root/test/abc /tmp/abc
func RecursionCopy(src, dst string) error {
	if IsDir(src) {
		return CopyDirV3(src, dst)
	}

	err := os.MkdirAll(filepath.Dir(dst), 0700|0055)
	if err != nil {
		return fmt.Errorf("failed to mkdir for recursion copy, err: %v", err)
	}

	return Copy(src, dst)
}

func CleanFile(file *os.File) {
	if file == nil {
		return
	}
	// the following operation won't failed regularly, if failed, log it
	err := file.Close()
	if err != nil && err != os.ErrClosed {
		logger.Warn(err)
	}
	err = os.Remove(file.Name())
	if err != nil {
		logger.Warn(err)
	}
}

func CleanDir(dir string) {
	if dir == "" {
		logger.Error("clean dir path is empty")
	}

	if err := os.RemoveAll(dir); err != nil {
		logger.Warn("failed to remove dir %s ", dir)
	}
}

func CleanDirs(dirs ...string) {
	if len(dirs) == 0 {
		return
	}
	for _, dir := range dirs {
		CleanDir(dir)
	}
}
func CleanFiles(file ...string) error {
	for _, f := range file {
		err := os.RemoveAll(f)
		if err != nil {
			return fmt.Errorf("failed to clean file %s, %v", f, err)
		}
	}
	return nil
}

func IsDir(path string) bool {
	s, err := os.Stat(path)
	if err != nil {
		return false
	}
	return s.IsDir()
}

func CountDirFiles(dirName string) int {
	if !IsDir(dirName) {
		return 0
	}
	var count int
	err := filepath.Walk(dirName, func(path string, info os.FileInfo, err error) error {
		if info.IsDir() {
			return nil
		}
		count++
		return nil
	})
	if err != nil {
		logger.Warn("count dir files failed %v", err)
		return 0
	}
	return count
}

func GetFileSize(path string) (size int64, err error) {
	_, err = os.Stat(path)
	if err != nil {
		return
	}
	err = filepath.Walk(path, func(_ string, info os.FileInfo, err error) error {
		if !info.IsDir() {
			size += info.Size()
		}
		return err
	})
	return size, err
}

func GetFilesSize(paths []string) (int64, error) {
	var size int64
	for i := range paths {
		s, err := GetFileSize(paths[i])
		if err != nil {
			return 0, err
		}
		size += s
	}
	return size, nil
}
