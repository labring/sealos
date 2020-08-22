package install

import (
	"archive/zip"
	"fmt"
	"github.com/wonderivan/logger"
	"go.etcd.io/etcd/clientv3/snapshot"
	"go.uber.org/zap"
	"io"
	"math/rand"
	"os"
	"path/filepath"
	"sync"
	"time"
)

func init() {
	rand.Seed(time.Now().UnixNano())
}

var letterRunes = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")

func RandStringRunes(n int) string {
	b := make([]rune, n)
	for i := range b {
		b[i] = letterRunes[rand.Intn(len(letterRunes))]
	}
	return string(b)
}

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

// StopPod is stop kubernetes kube-apiserver kube-controller-manager
// kube-scheduler etcd  by mv dir to other location.
func (e *EtcdFlags) StopPod() (string, error) {
	// stop kube-apiserver kube-controller-manager kube-scheduler etcd
	// on every etcd nodes , and back all data to /var/lib/etcd + 8 rand
	tmpDir := RandStringRunes(8)
	var wg sync.WaitGroup
	for _, host := range e.EtcdHosts {
		wg.Add(1)
		host = reFormatHostToIp(host)
		go func(h string) {
			defer wg.Done()
			// backup dir to random dir to avoid dir exist err
			stopEtcdCmd := fmt.Sprintf(`mv /etc/kubernetes/manifests /etc/kubernetes/manifests%s`, tmpDir)
			if err := CmdWork(host, stopEtcdCmd, TMPDIR); err != nil {
				logger.Error("backup /etc/kubernetes/manifests on host [%s] err: %s.", host, err)
				os.Exit(1)
			}
			// backup dir to random dir to avoid dir exist err
			backupEtcdCmd := fmt.Sprintf(`mv /var/lib/etcd %s`, ETCDDATADIR+tmpDir)
			if err := CmdWork(host, backupEtcdCmd, TMPDIR); err != nil {
				logger.Error("backup /var/lib/etcd host [%s] err: %s.", host, err)
				os.Exit(1)
			}
		}(host)
	}
	wg.Wait()
	return tmpDir, nil
}

// RestoreAll is restore all ETCD nodes
func (e *EtcdFlags) RestoreAll() {
	for _, host := range e.EtcdHosts {
		hostname := SSHConfig.CmdToString(host, "hostname", "")
		e.restore(hostname)
	}
}

// backup nodes by hostname to local filepath. like `RestoreDir-hostname`
func (e *EtcdFlags) restore(hostname string) {
	restorePeerURLs := GetEtcdPeerURLs(e.EtcdHosts)
	restoreClusterToken := "etcd-cluster"
	restoreCluster := GetEtcdInitialCluster(e.EtcdHosts)
	outputDir := fmt.Sprintf("%s-%s", e.RestoreDir, hostname)
	walDir := filepath.Join(outputDir, "member", "wal")

	lg, err := zap.NewProduction()
	if err != nil {
		logger.Error("get lg error: ", err)
		os.Exit(-1)
	}
	sp := snapshot.NewV3(lg)
	// get master name.

	if err := sp.Restore(snapshot.RestoreConfig{
		SnapshotPath:        e.LongName,
		Name:                "etcd-" + hostname,
		OutputDataDir:       outputDir,
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

func (e *EtcdFlags) AfterRestore() error {
	// first to mv every
	for _, host := range e.EtcdHosts {
		hostname := SSHConfig.CmdToString(host, "hostname", "")
		location := fmt.Sprintf("%s-%s", e.RestoreDir, hostname)
		tmpFlie := fmt.Sprintf("/tmp/%s.zip", filepath.Base(location))

		// 压缩已经已经restore的文件
		err := Compress(location, tmpFlie)
		if err != nil {
			return err
		}
		logger.Info("compress file")
		// 复制并解压到相应目录
		// todo
		AfterHook := fmt.Sprintf(`cd %s && unzip %s.zip && rm -rf %s.zip`, ETCDDATADIR, filepath.Base(location), filepath.Base(location))
		SendPackage(tmpFlie, []string{host}, ETCDDATADIR, nil, &AfterHook)
		//logger.Info("send etcd.zip to hosts")
	}

	return nil
}

// todo
func (e *EtcdFlags) StartPod(dir string) {
	var wg sync.WaitGroup
	for _, host := range e.EtcdHosts {
		wg.Add(1)
		host = reFormatHostToIp(host)
		go func(h string) {
			defer wg.Done()
			// start kube-apiserver
			stopEtcdCmd := fmt.Sprintf(`mv /etc/kubernetes/manifests%s /etc/kubernetes/manifests`, dir)
			if err := CmdWork(host, stopEtcdCmd, TMPDIR); err != nil {
				logger.Error("restore /etc/kubernetes/manifests on host [%s] err: %s.", host, err)
				os.Exit(1)
			}
		}(host)
	}
	wg.Wait()
}

// RecoveryKuBeCluster is when Restore is crashed . do nothing but to recovery
func (e *EtcdFlags) RecoveryKuBeCluster(dir string) {
	// restore old file first
	for _, host := range e.EtcdHosts {
		host = reFormatHostToIp(host)
		// rm old file then start cp bak to etcd dir
		recoverEtcdCmd := fmt.Sprintf(`rm -rf %s && mv %s %s`, ETCDDATADIR, ETCDDATADIR+dir, ETCDDATADIR)
		CmdWork(host, recoverEtcdCmd, TMPDIR)

	}
	// start pod next
	for _, host := range e.EtcdHosts {
		host = reFormatHostToIp(host)
		// start kube-apiserver
		stopEtcdCmd := fmt.Sprintf(`mv /etc/kubernetes/manifests%s /etc/kubernetes/manifests`, dir)
		CmdWork(host, stopEtcdCmd, TMPDIR)
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

// Compress is  compress all file in fileDir , and zip to outputPath
func Compress(fileDir string, outputPath string) error {
	outFile, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer outFile.Close()
	w := zip.NewWriter(outFile)
	defer w.Close()

	return filepath.Walk(fileDir, func(path string, f os.FileInfo, err error) error {
		if f == nil {
			return err
		}
		if f.IsDir() {
			return nil
		}
		rel, _ := filepath.Rel(fileDir, path)
		fmt.Println(rel, path)
		compress(rel, path, w)
		return nil
	})

}

func compress(rel string, path string, zw *zip.Writer) {
	file, _ := os.Open(path)
	info, _ := file.Stat()
	header, _ := zip.FileInfoHeader(info)
	header.Name = rel
	writer, _ := zw.CreateHeader(header)
	io.Copy(writer, file)
	defer file.Close()
}
