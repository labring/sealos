package sshutil

import "github.com/wonderivan/logger"

//Cmd is
func (ss *SSH) Cmd(host string, cmd string) []byte {
	logger.Info("[%s]exec cmd is : %s", host, cmd)
	session, err := ss.Connect(host)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[%s]Error create ssh session failed,%s", host, err)
		}
	}()
	if err != nil {
		panic(1)
	}
	defer session.Close()

	b, err := session.CombinedOutput(cmd)
	logger.Debug("[%s]command result is: %s", host, string(b))
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[%s]Error exec command failed: %s", host, err)
		}
	}()
	if err != nil {
		panic(1)
	}
	return b
}

func (ss *SSH) CmdToString(host, cmd string) string {
	data := ss.Cmd(host, cmd)
	if data != nil {
		return string(data)
	}
	return ""
}
