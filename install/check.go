package install

import (
	"github.com/wonderivan/logger"
	"golang.org/x/crypto/ssh"
	"os"
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
	dict := make(map[string]bool)
	for _, h := range s.Hosts {
		session, err := SSHConfig.Connect(h)
		if err != nil {
			logger.Error("[%s] ------------ check error", h)
			logger.Error("[%s] ------------ error[%s]", h, err)
			errors = append(errors, err)
		} else {
			hostname := SSHConfig.CmdToString(h, "hostname", "") //获取主机名
			if _, ok := dict[hostname]; !ok {
				dict[hostname] = true //不冲突, 主机名加入字典
			} else {
				logger.Error("duplicate hostnames is not allowed")
				os.Exit(1)
			}
			logger.Crit("[%s]  ------------ check ok", h)
			logger.Crit("[%s]  ------------ session[%p]", h, session)
		}
	}
	defer func() {
		if session != nil {
			session.Close()
		}
	}()
	if len(errors) > 0 {
		logger.Error("has some linux server is connection ssh is failed")
		os.Exit(1)
	}
}
