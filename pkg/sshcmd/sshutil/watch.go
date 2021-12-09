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

package sshutil

import (
	"fmt"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/fanux/sealos/pkg/logger"
)

const oneKBByte = 1024
const oneMBByte = 1024 * 1024

//WatchFileSize is
func (ss *SSH) LoggerFileSize(host, filename string, size int) {
	t := time.NewTicker(3 * time.Second) //every 3s check file
	defer t.Stop()
	for {
		if <-t.C; true {
			length := ss.CmdToString(host, "ls -l "+filename+" | awk '{print $5}'", "")
			length = strings.Replace(length, "\n", "", -1)
			length = strings.Replace(length, "\r", "", -1)
			lengthByte, _ := strconv.Atoi(length)
			if lengthByte == size {
				t.Stop()
			}
			lengthFloat := float64(lengthByte)
			value, _ := strconv.ParseFloat(fmt.Sprintf("%.2f", lengthFloat/oneMBByte), 64)
			logger.Info("[ssh][%s]transfer total size is: %.2f%s", host, value, "MB")
		}
	}
}

//RemoteFileExist is
func (ss *SSH) IsFileExist(host, remoteFilePath string) bool {
	// if remote file is
	// ls -l | grep aa | wc -l
	remoteFileName := path.Base(remoteFilePath) // aa
	remoteFileDirName := path.Dir(remoteFilePath)
	//it's bug: if file is aa.bak, `ls -l | grep aa | wc -l` is 1 ,should use `ll aa 2>/dev/null |wc -l`
	//remoteFileCommand := fmt.Sprintf("ls -l %s| grep %s | grep -v grep |wc -l", remoteFileDirName, remoteFileName)
	remoteFileCommand := fmt.Sprintf("ls -l %s/%s 2>/dev/null |wc -l", remoteFileDirName, remoteFileName)

	data := ss.CmdToString(host, remoteFileCommand, " ")
	count, err := strconv.Atoi(strings.TrimSpace(data))
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[ssh][%s]RemoteFileExist:%s", host, err)
		}
	}()
	if err != nil {
		panic(1)
	}
	return count != 0
}

func toSizeFromInt(length int) (float64, string) {
	value, _ := strconv.ParseFloat(fmt.Sprintf("%.2f", float64(length)/oneMBByte), 64)
	if isMb := length/oneMBByte > 1; isMb {
		return value, "MB"
	}
	value, _ = strconv.ParseFloat(fmt.Sprintf("%.2f", float64(length)/oneKBByte), 64)
	return value, "KB"
}
