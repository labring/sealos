package cmd

import (
	"fmt"
	"github.com/wonderivan/logger"
	"path"
	"strconv"
	"strings"
)

//RemoteFilExist is
func IsFilExist(filepath string) bool {
	// if remote file is
	// ls -l | grep aa | wc -l
	fileName := path.Base(filepath) // aa
	fileDirName := path.Dir(filepath)
	fileCommand := fmt.Sprintf("ls -l %s | grep %s | wc -l", fileDirName, fileName)
	data := strings.Replace(CmdToString("/bin/sh", "-c", fileCommand), "\r", "", -1)
	data = strings.Replace(data, "\n", "", -1)
	count, err := strconv.Atoi(strings.TrimSpace(data))
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[os][%s]RemoteFilExist:%s", filepath, err)
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
