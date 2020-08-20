package install

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"github.com/wonderivan/logger"
	"io/ioutil"
	"net/http"
	"os"
	"time"
)

type RestoreFlags struct {
	SnapshotName string
	Dir          string
	SnapshotPath string
	RestorePath  string
	EtcdctlCmd   string
	EtcdHosts    []string
	SealConfig
}

func GetRestoreFlags() *RestoreFlags {
	r := &RestoreFlags{}
	err := r.Load("")
	if err != nil {
		logger.Error(err)
		r.ShowDefaultConfig()
		os.Exit(0)
	}
	r.SnapshotName = SnapshotName
	r.Dir = EtcdBackDir
	r.RestorePath = RestorePath
	r.SnapshotPath = fmt.Sprintf("%s/%s", EtcdBackDir, SnapshotName)
	r.EtcdHosts = r.Masters
	return r
}

func RestoreFromLocal(r *RestoreFlags) {
	if err := r.Prepare(); err != nil {
		os.Exit(-1)
	}

	time.Sleep(time.Second * 10)
	if err := r.Restore(); err != nil {
		logger.Error(err)
		os.Exit(-1)
	}

	time.Sleep(time.Second * 10)
	if err := r.AfterRestore(); err != nil {
		logger.Error(err)
		os.Exit(-1)
	}
	// 等待30s集群重启。
	time.Sleep(time.Second * 10)

	// 健康检查
	r.HealthCheck()

	// todo  recovery old kubernetes, when use sealos to restore , the cluster is not health. do nothing?
}

func (r *RestoreFlags) Prepare() error {
	// stop kube-apiserver kube-controller-manager kube-scheduler etcd
	// on every etcd nodes , and back all data to /var/lib/etcd.bak
	for _, host := range r.EtcdHosts {
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

func (r *RestoreFlags) Restore() error {
	initCluster := GetEtcdInitialCluster(r.EtcdHosts)
	for _, host := range r.EtcdHosts {
		host = reFormatHostToIp(host)
		hostname := SSHConfig.CmdToString(host, "hostname", "")
		removeRestoreCmd := fmt.Sprintf("rm -rf %s", r.RestorePath)
		CmdWorkSpace(host, removeRestoreCmd, TMPDIR)
		if err := ectdRestoreDefault(host, hostname, r.SnapshotName, r.Dir, r.RestorePath, initCluster); err != nil {
			return fmt.Errorf("[etcd] Failed to restore etcd snapshot: %v", err)
		}

		newRestore := fmt.Sprintf(`mv %s  %s`, r.RestorePath, ETCDDATEDIR)
		if err := CmdWork(host, newRestore, TMPDIR); err != nil {
			return err
		}

	}
	return nil
}

func ectdRestoreDefault(host, hostname, snapshotName, savaPath, restorePath, initCluster string) error {
	logger.Info("[etcd] Restoring [%s] snapshot on etcd host [%s]", snapshotName, host)
	cmd := getDefaultRestoreCmd(host, hostname, snapshotName, restorePath, initCluster)
	// second to restore cluster
	fmt.Println(cmd)
	if err := CmdWork(host, cmd, savaPath); err != nil {
		return err
	}
	return nil
}

func getDefaultRestoreCmd(host, hostname, snapshotName, restorePath, initCluster string) string {
	//endpoints := fmt.Sprintf("%s:2379", host)
	eCmd := getDefaultCmd()
	peerUrl := fmt.Sprintf("https://%s:2380", host)
	cmd := fmt.Sprintf(`%s--name=etcd-%s \
--data-dir=%s \
--initial-cluster=%s \
--initial-cluster-token="etcd-cluster"  \
--initial-advertise-peer-urls=%s \
snapshot restore %s \
`, eCmd, hostname, restorePath, initCluster, peerUrl, snapshotName)
	return cmd
}

func getDefaultCmd() string {
	etcdctl := "ETCDCTL_API=3 etcdctl"
	etcdCacart := "/etc/kubernetes/pki/etcd/ca.crt"
	etcdCert := "/etc/kubernetes/pki/etcd/healthcheck-client.crt"
	etcdKey := "/etc/kubernetes/pki/etcd/healthcheck-client.key"
	//endpoints := fmt.Sprintf("%s:2379", host)
	cmd := fmt.Sprintf(`%s \
--cert %s \
--key %s \
--cacert %s \
`, etcdctl, etcdCert, etcdKey, etcdCacart)
	return cmd
}

func (r *RestoreFlags) AfterRestore() error {

	// start kube-apiserver kube-controller-manager kube-scheduler etcd
	for _, host := range r.EtcdHosts {
		host = reFormatHostToIp(host)
		manifestsCmd := `mv /etc/kubernetes/manifests.bak /etc/kubernetes/manifests`
		if err := CmdWork(host, manifestsCmd, TMPDIR); err != nil {
			return err
		}
	}
	return nil
}

func (r *RestoreFlags) HealthCheck() {
	c := make(chan bool)
	for _, host := range r.EtcdHosts {
		host = reFormatHostToIp(host)
		for i := 0; i < RETRYTIMES; i++ {
			if err := HealthCheck(host); err == nil {
				break
			}
			logger.Info("wait etcd to health")
			time.Sleep(3 * time.Second)
		}
	}
}

func HealthCheck(host string) error {
	cmd := getDefaultCmd()
	endpoints := fmt.Sprintf("%s:2379", host)
	health := fmt.Sprintf(`%s--endpoints %s  endpoint health --write-out=json`, cmd, endpoints)
	resp := SSHConfig.CmdToString(host, health, "")
	var healthy []response
	if err := json.Unmarshal([]byte(resp), &healthy); err != nil {
		return err
	}
	if !healthy[0].Health {
		return fmt.Errorf("failed to read response of /health for host [%s]: %v", host, healthy[0].Health)
	}
	//logger.Info(healthy)
	return nil
}

type response struct {
	Endpoint string `json:"endpoint"`
	Health   bool   `json:"health"`
	Took     string `json:"took"`
	Error    string `json:"error"`
}

func getHealthEtcd(hc http.Client, host string, url string) (bool, error) {
	healthy := response{}
	resp, err := hc.Get(url)
	if err != nil {
		return healthy.Health, fmt.Errorf("failed to get /health for host [%s]: %v", host, err)
	}
	bytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return healthy.Health, fmt.Errorf("failed to read response of /health for host [%s]: %v", host, err)
	}
	resp.Body.Close()
	if err := json.Unmarshal(bytes, &healthy); err != nil {
		return healthy.Health, fmt.Errorf("failed to unmarshal response of /health for host [%s]: %v", host, err)
	}
	return healthy.Health, nil
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

// get  tls config
func getEtcdTLSConfig(certificate, key []byte) (*tls.Config, error) {
	// get tls config
	x509Pair, err := tls.X509KeyPair([]byte(certificate), []byte(key))
	if err != nil {
		return nil, err

	}
	tlsConfig := &tls.Config{
		InsecureSkipVerify: true,
		Certificates:       []tls.Certificate{x509Pair},
	}
	return tlsConfig, nil
}

//todo
// if we fail after cleanup, we can't find the certs to do the download, we need to redeploy them
// Cleaning old kubernetes cluster
// Start restore process on all etcd hosts
// Initiating Kubernetes cluster
// check Kubernetes cluster
// RestartClusterPods
