package sshutil

import (
	"fmt"
	"github.com/wonderivan/logger"
	"path"
	"strconv"
	"strings"
)

const oneKBByte = 1024
const oneMBByte = 1024 * 1024

//RemoteFilExist is
func (ss *SSH) IsFilExist(host, remoteFilePath string) bool {
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
			logger.Error("[ssh][%s]RemoteFilExist:%s", host, err)
		}
	}()
	if err != nil {
		panic(1)
	}
	if count == 0 {
		return false
	} else {
		return true
	}
}

func toSizeFromInt(length int) (float64, string) {
	isMb := length/oneMBByte > 1
	value, _ := strconv.ParseFloat(fmt.Sprintf("%.2f", float64(length)/oneMBByte), 64)
	if isMb {
		return value, "MB"
	} else {
		value, _ = strconv.ParseFloat(fmt.Sprintf("%.2f", float64(length)/oneKBByte), 64)
		return value, "KB"
	}
}
