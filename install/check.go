package install

import (
	"github.com/wonderivan/logger"
	"golang.org/x/crypto/ssh"
)

//CheckValid is
func (s *SealosInstaller) CheckValid() {
	hosts := append(Masters, Nodes...)
	var session *ssh.Session
	for _, h := range hosts {
		session, err := Connect(User, Passwd, PrivateKeyFile, h)
		if err != nil {
			logger.Error("[%s] ------------ check error", h)
			logger.Error("[%s] ------------ error[%s]", h, err)
		} else {
			logger.Crit("[%s]  ------------ check ok", h)
			logger.Crit("[%s]  ------------ session[%p]", h, session)
		}
	}
	defer func() {
		if session != nil {
			session.Close()
		}
	}()
}
