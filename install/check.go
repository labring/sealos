package install

import (
	"fmt"
	"github.com/wonderivan/logger"
	"os"
)

// if can't access to hostName, set /etc/hosts
func SetHosts(hostip, hostName string) {
	cmd := fmt.Sprintf("cat /etc/hosts |grep %s || echo '%s %s' >> /etc/hosts", hostName, IpFormat(hostip), hostName)
	SSHConfig.CmdAsync(hostip, cmd)
}

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
	dict := make(map[string]bool)
	for _, h := range s.Hosts {
		hostname := SSHConfig.CmdToString(h, "hostname", "") //获取主机名
		if hostname == "" {
			logger.Error("[%s] ------------ check error", h)
			os.Exit(1)
		} else {
			SetHosts(h,hostname)
			if _, ok := dict[hostname]; !ok {
				dict[hostname] = true //不冲突, 主机名加入字典
			} else {
				logger.Error("duplicate hostnames is not allowed")
				os.Exit(1)
			}
			logger.Info("[%s]  ------------ check ok", h)
		}
	}
}
