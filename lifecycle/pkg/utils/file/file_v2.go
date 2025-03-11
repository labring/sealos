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
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/labring/sealos/pkg/utils/logger"
)

// Filename returns the file name after the last "/".
func Filename(f string) string {
	i := strings.LastIndexByte(f, '/')
	return f[i+1:]
}

// IsExist returns if a file exists.
func IsExist(fileName string) bool {
	if _, err := os.Stat(fileName); err != nil {
		return os.IsExist(err)
	}
	return true
}

// IsFile returns true if given path is a file,
// or returns false when it's a directory or does not exist.
func IsFile(filePath string) bool {
	f, e := os.Stat(filePath)
	if e != nil {
		return false
	}
	return !f.IsDir()
}

func IsTarFile(s string) bool {
	return strings.HasSuffix(s, ".tar") || strings.HasSuffix(s, ".gz") || strings.HasSuffix(s, ".tgz")
}

// IsDir returns if the given path is a directory.
func IsDir(path string) bool {
	s, err := os.Stat(path)
	if err != nil {
		return false
	}
	return s.IsDir()
}

// GetFiles returns all the files under the path.
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

// ReadLines reads the contents from the file line by line.
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

// WriteLines outputs lines to the file.
func WriteLines(fileName string, lines []string) error {
	var sb strings.Builder
	for _, line := range lines {
		sb.WriteString(line + "\n")
	}
	return WriteFile(fileName, []byte(sb.String()))
}

// ReadAll reads all the content of the file.
func ReadAll(fileName string) ([]byte, error) {
	return os.ReadFile(fileName)
}

// MkDirs creates directories.
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

// MkTmpdir creates a temporary directory.
func MkTmpdir(dir string) (string, error) {
	tempDir, err := os.MkdirTemp(dir, "DTmp-")
	if err != nil {
		return "", err
	}
	return tempDir, os.MkdirAll(tempDir, 0755)
}

// MkTmpFile creates a temporary file.
func MkTmpFile(path string) (*os.File, error) {
	return os.CreateTemp(path, "FTmp-")
}

// WriteFile outputs all content to the file.
func WriteFile(fileName string, content []byte) error {
	dir := filepath.Dir(fileName)
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if err = os.MkdirAll(dir, 0755); err != nil {
			return err
		}
	}

	return AtomicWriteFile(fileName, content, 0644)
}

// RecursionCopy equals to `cp -r`
func RecursionCopy(src, dst string) error {
	if src == dst {
		return nil
	}
	if IsDir(src) {
		return CopyDirV3(src, dst)
	}

	err := os.MkdirAll(filepath.Dir(dst), 0700|0055)
	if err != nil {
		return fmt.Errorf("failed to mkdir for recursion copy, err: %v", err)
	}

	return Copy(src, dst)
}

// CleanFile removes the file.
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

// CleanFiles removes multiple files.
func CleanFiles(file ...string) error {
	for _, f := range file {
		err := os.RemoveAll(f)
		if err != nil {
			return fmt.Errorf("failed to clean file %s, %v", f, err)
		}
	}
	return nil
}

// CleanDir removes the directory.
func CleanDir(dir string) {
	if dir == "" {
		logger.Error("clean dir path is empty")
	}

	if err := os.RemoveAll(dir); err != nil {
		logger.Warn("failed to remove dir %s ", dir)
	}
}

// CleanDirs removes multiple directories.
func CleanDirs(dirs ...string) {
	if len(dirs) == 0 {
		return
	}
	for _, dir := range dirs {
		CleanDir(dir)
	}
}

// CountDirFiles reutrns # of files under a directory.
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

// GetFileSize returns the size of a file.
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

// GetFilesSize returns the size of multiple files.
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
