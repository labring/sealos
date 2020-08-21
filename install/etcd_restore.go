package install

import (
	"fmt"
	"github.com/wonderivan/logger"
	"go.etcd.io/etcd/clientv3/snapshot"
	"go.uber.org/zap"
	"os"
	"path/filepath"
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

// we don't restore kubernetes but restore etcd
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

func (e *EtcdFlags) Restore() {
	restorePeerURLs := GetEtcdPeerURLs(e.EtcdHosts)
	restoreClusterToken := "etcd-cluster"
	restoreCluster:= GetEtcdInitialCluster(e.EtcdHosts)
	walDir := filepath.Join(e.RestoreDir, "member", "wal")

	lg, err := zap.NewProduction()
	if err != nil {
		logger.Error("get lg error: ", err)
		os.Exit(-1)
	}
	sp := snapshot.NewV3(lg)
	// get master name.
	host := SSHConfig.CmdToString(e.EtcdHosts[0], "hostname", "")
	if err := sp.Restore(snapshot.RestoreConfig{
		SnapshotPath:        e.LongName,
		Name:                "etcd-"+host,
		OutputDataDir:       e.RestoreDir,
		OutputWALDir:        walDir,
		PeerURLs:            restorePeerURLs,
		InitialCluster:      restoreCluster,
		InitialClusterToken: restoreClusterToken,
		SkipHashCheck:       true,
	}); err != nil {
		logger.Error("restore etcd error: ", err)
		os.Exit(-1)
	}
}

func GetEtcdInitialCluster(hosts []string) string {
	initialCluster := ""
	for i, host := range hosts {
		hostname := SSHConfig.CmdToString(host, "hostname", "")
		ip := reFormatHostToIp(host)
		initialCluster += fmt.Sprintf("etcd-%s=https://%s:2380", hostname, ip)
		if i < (len(hosts) - 1) {
			initialCluster += ","
		}
	}
	return initialCluster
}

func GetEtcdPeerURLs(hosts []string) []string {
	var peerUrls []string
 	for _, host := range hosts {
		ip := reFormatHostToIp(host)
		url := fmt.Sprintf("https://%s:2380", ip)
		peerUrls = append(peerUrls, url)
	}
	return peerUrls
}

func CmdWork(node, cmd, workdir string) error {
	command := fmt.Sprintf("cd %s && %s", workdir, cmd)
	// not safe when use etcdctl to backup
	return SSHConfig.CmdAsyncEctd(node, command)
}
