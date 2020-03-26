package cmd

import (
	"bytes"
	"github.com/wonderivan/logger"
	"os"
	"os/exec"
)

//Cmd is exec on os ,no return
func Cmd(name string, arg ...string) {
	logger.Info("[os]exec cmd is : ", name, arg)
	cmd := exec.Command(name, arg[:]...)
	cmd.Stdin = os.Stdin
	cmd.Stderr = os.Stderr
	cmd.Stdout = os.Stdout
	err := cmd.Run()
	if err != nil {
		logger.Error("[os]os call error.", err)
	}
}

//CmdToString is exec on os , return result
func CmdToString(name string, arg ...string) string {
	logger.Info("[os]exec cmd is : ", name, arg)
	cmd := exec.Command(name, arg[:]...)
	cmd.Stdin = os.Stdin
	var b bytes.Buffer
	cmd.Stdout = &b
	cmd.Stderr = &b
	err := cmd.Run()
	if err != nil {
		logger.Error("[os]os call error.", err)
		return ""
	}
	return b.String()
}
