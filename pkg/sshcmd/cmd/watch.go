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

package cmd

import (
	"fmt"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/fanux/sealos/pkg/logger"
)

const oneMBByte = 1024 * 1024

//WatchFileSize is
func LoggerFileSize(filename string, size int) {
	t := time.NewTicker(3 * time.Second) //every 3s check file
	defer t.Stop()
	for {
		if <-t.C; true {
			length := String("/bin/sh", "-c", "ls -l "+filename+" | awk '{print $5}'", "")
			length = strings.Replace(length, "\n", "", -1)
			length = strings.Replace(length, "\r", "", -1)
			lengthByte, _ := strconv.Atoi(length)
			if lengthByte == size {
				t.Stop()
			}
			lengthFloat := float64(lengthByte)
			value, _ := strconv.ParseFloat(fmt.Sprintf("%.2f", lengthFloat/oneMBByte), 64)
			logger.Info("[os][%s]transfer total size is: %.2f%s", filename, value, "MB")
		}
	}
}

//RemoteFileExist is
func IsFileExist(filepath string) bool {
	// if remote file is
	// ls -l | grep aa | wc -l
	fileName := path.Base(filepath) // aa
	fileDirName := path.Dir(filepath)
	fileCommand := fmt.Sprintf("ls -l %s | grep %s | wc -l", fileDirName, fileName)
	data := strings.Replace(String("/bin/sh", "-c", fileCommand), "\r", "", -1)
	data = strings.Replace(data, "\n", "", -1)
	count, err := strconv.Atoi(strings.TrimSpace(data))
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[os][%s]RemoteFileExist:%s", filepath, err)
		}
	}()
	if err != nil {
		panic(1)
	}
	return count != 0
}
