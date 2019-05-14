package install

import (
	"fmt"
	"path"
	"strings"
	"sync"

	"github.com/wonderivan/logger"
)

//SendPackage is
func (s *SealosInstaller) SendPackage(url string) {
	pkg := path.Base(url)
	//only http
	isHTTP := strings.HasPrefix(url, "http")
	wgetCommand := ""
	if isHTTP {
		wgetParam := ""
		if strings.HasPrefix(url, "https") {
			wgetParam = "--no-check-certificate"
		}
		wgetCommand = fmt.Sprintf(" wget %s ", wgetParam)
	}
	remoteCmd := fmt.Sprintf("cd /root &&  %s %s && tar zxvf %s", wgetCommand, url, pkg)
	localCmd := fmt.Sprintf("cd /root && rm -rf kube && tar zxvf %s ", pkg)
	kubeCmd := "cd /root/kube/shell && sh init.sh"
	kubeLocal := fmt.Sprintf("/root/%s", pkg)

	var wm sync.WaitGroup
	var wn sync.WaitGroup
	for i, master := range s.Masters {
		wm.Add(1)
		go func(master, port string) {
			defer wm.Done()
			logger.Debug("please wait for tar zxvf exec")
			if RemoteFilExist(master, port, kubeLocal) {
				logger.Warn("host is ", master, ", SendPackage: file is exist")
				Cmd(master, port, localCmd)
			} else {
				if isHTTP {
					go WatchFileSize(master, port, kubeLocal, GetFileSize(url))
					Cmd(master, port, remoteCmd)
				} else {
					Copy(master, port, url, kubeLocal)
					Cmd(master, port, localCmd)
				}
			}
			Cmd(master, port, kubeCmd)
		}(master, s.MastersPorts[i])
	}
	for i, node := range s.Nodes {
		wn.Add(1)
		go func(node, port string) {
			defer wn.Done()
			logger.Debug("please wait for tar zxvf exec")
			if RemoteFilExist(node, port, kubeLocal) {
				logger.Warn("host is ", node, ", SendPackage: file is exist")
				Cmd(node, port, localCmd)
			} else {
				if isHTTP {
					go WatchFileSize(node, port, kubeLocal, GetFileSize(url))
					Cmd(node, port, remoteCmd)
				} else {
					Copy(node, port, url, kubeLocal)
					Cmd(node, port, localCmd)
				}
			}
			Cmd(node, port, kubeCmd)
		}(node, s.NodesPorts[i])
	}

	wm.Wait()
	wn.Wait()
}
