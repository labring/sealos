package sshutil

import (
	"bufio"
	"github.com/wonderivan/logger"
	"strings"
)

//Cmd is in host exec cmd
func (ss *SSH) Cmd(host string, cmd string) []byte {
	logger.Info("[ssh][%s]exec cmd is : %s", host, cmd)
	session, err := ss.Connect(host)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[ssh][%s]Error create ssh session failed,%s", host, err)
		}
	}()
	if err != nil {
		panic(1)
	}
	defer session.Close()
	b, err := session.CombinedOutput(cmd)
	logger.Debug("[ssh][%s]command result is: %s", host, string(b))
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[ssh][%s]Error exec command failed: %s", host, err)
		}
	}()
	if err != nil {
		panic(1)
	}
	return b
}

func (ss *SSH) CmdAsync(host string, cmd string) error {
	logger.Info("[ssh][%s]exec cmd is : %s", host, cmd)
	session, err := ss.Connect(host)
	if err != nil {
		logger.Error("[ssh][%s]Error create ssh session failed,%s", host, err)
		return err
	}
	defer session.Close()
	stdout, err := session.StdoutPipe()
	if err != nil {
		logger.Error("[ssh][%s]Unable to request StdoutPipe(): %s", host, err)
		return err
	}
	if err := session.Start(cmd); err != nil {
		logger.Error("[ssh][%s]Unable to execute command: %s", host, err)
		return err
	}
	done := make(chan bool, 1)
	go func() {
		for {
			r := bufio.NewReader(stdout)
			line, _, err := r.ReadLine()
			if line == nil || err != nil {
				done <- true
			} else {
				logger.Info("[ssh][%s]: %s", host, line)
			}
		}
	}()
	<-done
	return nil
}

//CmdToString is in host exec cmd and replace to spilt str
func (ss *SSH) CmdToString(host, cmd, spilt string) string {
	data := ss.Cmd(host, cmd)
	if data != nil {
		str := string(data)
		str = strings.ReplaceAll(str, "\r\n", spilt)
		return str
	}
	return ""
}
