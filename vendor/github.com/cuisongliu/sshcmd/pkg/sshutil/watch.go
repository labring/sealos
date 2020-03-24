package sshutil

import (
	"bytes"
	"fmt"
	"github.com/wonderivan/logger"
	"path"
	"strconv"
	"strings"
	"time"
)

const oneMBByte = 1024 * 1024

//WatchFileSize is
func (ss *SSH) LoggerFileSize(host, filename string, size int) {
	t := time.NewTicker(3 * time.Second) //every 3s check file
	defer t.Stop()
	for {
		select {
		case <-t.C:
			length := ss.CmdToString(host, "ls -l "+filename+" | awk '{print $5}'", "")
			length = strings.Replace(length, "\n", "", -1)
			length = strings.Replace(length, "\r", "", -1)
			lengthByte, _ := strconv.Atoi(length)
			if lengthByte == size {
				t.Stop()
			}
			lengthFloat := float64(lengthByte)
			value, _ := strconv.ParseFloat(fmt.Sprintf("%.2f", lengthFloat/oneMBByte), 64)
			logger.Alert("[%s]transfer total size is: %.2f%s", host, value, "MB")
		}
	}
}

//RemoteFilExist is
func (ss *SSH) IsFilExist(host, remoteFilePath string) bool {
	// if remote file is
	// ls -l | grep aa | wc -l
	remoteFileName := path.Base(remoteFilePath) // aa
	remoteFileDirName := path.Dir(remoteFilePath)
	remoteFileCommand := fmt.Sprintf("ls -l %s | grep %s | wc -l", remoteFileDirName, remoteFileName)
	data := bytes.Replace(ss.Cmd(host, remoteFileCommand), []byte("\r"), []byte(""), -1)
	data = bytes.Replace(data, []byte("\n"), []byte(""), -1)

	count, err := strconv.Atoi(string(data))
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[%s]RemoteFilExist:%s", host, err)
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
