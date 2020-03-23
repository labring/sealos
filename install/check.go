package install

import (
	"bytes"
	"fmt"
	"github.com/wonderivan/logger"
	"golang.org/x/crypto/ssh"
	"os"
	"strings"
)

//CheckValid is
func (s *SealosInstaller) CheckValid() {
	//hosts := append(Masters, Nodes...)
	// 所有master节点
	//masters := append(Masters, ParseIPs(MasterIPs)...)
	// 所有node节点
	//nodes := append(Nodes, ParseIPs(NodeIPs)...)
	//hosts := append(masters, nodes...)
	var hosts []string
	hosts = append(s.Masters, s.Nodes...)
	if len(s.Hosts) == 0 && len(hosts) == 0 {
		s.Print("Fail")
		logger.Error("hosts not allow empty")
		os.Exit(1)
	}
	if SSHConfig.User == "" {
		s.Print("Fail")
		logger.Error("user not allow empty")
		os.Exit(1)
	}
	var session *ssh.Session
	var errors []error
	var hostname []string
	for _, h := range s.Hosts {
		session, err := SSHConfig.Connect(h)
		if err != nil {
			logger.Error("[%s] ------------ check error", h)
			logger.Error("[%s] ------------ error[%s]", h, err)
			errors = append(errors, err)
		} else {
			//check hostname
			var stdOut, stdErr bytes.Buffer
			session.Stdout = &stdOut
			session.Stderr = &stdErr
			session.Run("hostname")
			ret := strings.Replace( stdOut.String(), "\n", "", -1 )
			fmt.Printf("%s\n", ret)
			hostname=append(hostname,ret)

			logger.Crit("[%s]  ------------ check ok", h)
			logger.Crit("[%s]  ------------ session[%p]", h, session)
		}
	}

	fmt.Println(hostname[0])
	fmt.Println(hostname[1])
	fmt.Println(hostname[2])
	fmt.Println(hostname[3])
	defer func() {
		if session != nil {
			session.Close()
		}
	}()
	if len(errors) > 0 {
		logger.Error("has some linux server is connection ssh is failed")
		os.Exit(1)
	}
	os.Exit(1)
}

func InSlice (arr []string, val string) bool{
	for _, v := range arr {
		if v == val { return true }
	}
	return false
}
