package install

import (
	"fmt"
	"github.com/wonderivan/logger"
	"os"
)

func GetRestoreFlags() *EtcdFlags {
	e := &EtcdFlags{}
	err := e.Load("")
	if err != nil {
		logger.Error(err)
		e.ShowDefaultConfig()
		os.Exit(0)
	}
	e.Name = SnapshotName
	e.BackDir = EtcdBackDir
	e.RestoreDir = RestorePath
	e.LongName = fmt.Sprintf("%s/%s", e.BackDir, e.Name)
	for _, h := range e.Masters {
		ip := reFormatHostToIp(h)
		enpoint := fmt.Sprintf("%s:2379", ip)
		e.EtcdHosts = append(e.EtcdHosts, ip)
		e.Endpoints = append(e.Endpoints, enpoint)
	}
	return e
}

func (e *EtcdFlags) Prepare() error {
	// stop kube-apiserver kube-controller-manager kube-scheduler etcd
	// on every etcd nodes , and back all data to /var/lib/etcd.bak
	for _, host := range e.EtcdHosts {
		host = reFormatHostToIp(host)
		// backup dir
		stopEtcdCmd := `[ -d /etc/kubernetes/manifests.bak ] || mv /etc/kubernetes/manifests /etc/kubernetes/manifests.bak`
		if err := CmdWork(host, stopEtcdCmd, TMPDIR); err != nil {
			logger.Error("backup /etc/kubernetes/manifests on host [%s] err: %s.", host, err)
			return err
		}
		// backup dir if exsit then do nothing
		backupEtcdCmd := `[ -d /var/lib/etcd.bak ] || mv /var/lib/etcd /var/lib/etcd.bak`
		if err := CmdWork(host, backupEtcdCmd, TMPDIR); err != nil {
			logger.Error("backup /var/lib/etcd host [%s] err: %s.", host, err)
			return err
		}
	}
	return nil
}

func CmdWork(node, cmd, workdir string) error {
	command := fmt.Sprintf("cd %s && %s", workdir, cmd)
	// not safe when use etcdctl to backup
	return SSHConfig.CmdAsyncEctd(node, command)
}
