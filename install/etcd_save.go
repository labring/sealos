package install

import (
	"context"
	"fmt"
	"github.com/wonderivan/logger"
	"go.etcd.io/etcd/clientv3"
	"go.etcd.io/etcd/clientv3/snapshot"
	"go.etcd.io/etcd/etcdserver/api/v3rpc/rpctypes"
	"go.etcd.io/etcd/pkg/transport"
	"go.uber.org/zap"
	"os"
	"strings"
	"sync"
	"time"
)

type EtcdFlags struct {
	Name       string
	BackDir    string
	EtcdHosts  []string
	Endpoints  []string
	LongName   string
	RestoreDir string
	SealConfig
}

func GetEtcdBackFlags() *EtcdFlags {
	var (
		ip, endpoint string
	)
	e := &EtcdFlags{}
	err := e.Load("")
	if err != nil {
		logger.Error(err)
		e.ShowDefaultConfig()
		os.Exit(0)
	}
	// get Etcd host
	e.EtcdHosts = e.Masters
	e.BackDir = EtcdBackDir
	e.Name = SnapshotName
	e.LongName = fmt.Sprintf("%s/%s", e.BackDir, e.Name)

	for _, h := range e.Masters {
		ip = reFormatHostToIp(h)
		e.EtcdHosts = append(e.EtcdHosts, ip)
	}
	// snapshot must be requested to one selected node, not multiple.
	endpoint = fmt.Sprintf("%s:2379", reFormatHostToIp(e.Masters[0]))
	e.Endpoints = append(e.Endpoints, endpoint)
	return e
}

func Save(e *EtcdFlags) {
	if !FileExist(e.BackDir) {
		err := os.MkdirAll(e.BackDir, os.ModePerm)
		if err != nil {
			logger.Error("mkdir BackDir err: ",err)
			os.Exit(1)
		}
	}

	cfg, err := GetCfg(e.Endpoints)
	if err != nil {
		logger.Error("get etcd cfg error: ", err)
		os.Exit(-1)
	}
	lg, err := zap.NewProduction()
	if err != nil {
		logger.Error("get lg error: ", err)
		os.Exit(-1)
	}
	sp := snapshot.NewV3(lg)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := sp.Save(ctx, *cfg, e.LongName); err != nil {
		logger.Error("snapshot save err: ", err)
		os.Exit(-1)
	}
	fmt.Printf("Snapshot saved at %s\n", e.LongName)
}

func reFormatHostToIp(host string) string {
	if strings.Contains(host, ":") {
		s := strings.Split(host, ":")
		return s[0]
	}
	return host
}

func GetCfg(ep []string) (*clientv3.Config, error) {
	var cfgtls *transport.TLSInfo
	tlsinfo := transport.TLSInfo{}
	tlsinfo.CertFile = EtcdCert
	tlsinfo.KeyFile = EtcdKey
	tlsinfo.TrustedCAFile = EtcdCacart
	tlsinfo.InsecureSkipVerify = true
	tlsinfo.Logger, _ = zap.NewProduction()
	cfgtls = &tlsinfo
	clientTLS, err := cfgtls.ClientConfig()
	if err != nil {
		return nil, err
	}
	cfg := &clientv3.Config{
		Endpoints:   ep,
		DialTimeout: 5 * time.Second,
		TLS:         clientTLS,
	}
	return cfg, nil
}

func GetEctdClient(ep []string) (*clientv3.Client, error) {
	var cfgtls *transport.TLSInfo
	tlsinfo := transport.TLSInfo{}
	tlsinfo.CertFile = EtcdCert
	tlsinfo.KeyFile = EtcdKey
	tlsinfo.TrustedCAFile = EtcdCacart
	tlsinfo.InsecureSkipVerify = true
	tlsinfo.Logger, _ = zap.NewProduction()
	cfgtls = &tlsinfo
	clientTLS, err := cfgtls.ClientConfig()
	if err != nil {
		return nil, err
	}
	cli, err := clientv3.New(clientv3.Config{
		Endpoints:   ep,
		DialTimeout: 5 * time.Second,
		TLS:         clientTLS,
	})
	return cli, nil
}

type epHealth struct {
	Ep     string `json:"endpoint"`
	Health bool   `json:"health"`
	Took   string `json:"took"`
	Error  string `json:"error"`
}

func (e *EtcdFlags) HealthCheck() {
	cfgs := []*clientv3.Config{}
	for _, ep := range e.Endpoints {
		cfg, err := GetCfg([]string{ep})
		if err != nil {
			logger.Error(err)
		}
		cfgs = append(cfgs, cfg)
	}
	var wg sync.WaitGroup
	hch := make(chan epHealth, len(cfgs))
	for _, cfg := range cfgs {
		wg.Add(1)
		go func(cfg *clientv3.Config) {
			defer wg.Done()
			ep := cfg.Endpoints[0]
			cli, err := clientv3.New(*cfg)
			if err != nil {
				hch <- epHealth{Ep: ep, Health: false, Error: err.Error()}
				return
			}
			st := time.Now()
			// get a random key. As long as we can get the response without an error, the
			// endpoint is health.
			ctx, cancel := context.WithTimeout(context.Background(), time.Second*60)
			_, err = cli.Get(ctx, "health")
			cancel()
			eh := epHealth{Ep: ep, Health: false, Took: time.Since(st).String()}
			// permission denied is OK since proposal goes through consensus to get it
			if err == nil || err == rpctypes.ErrPermissionDenied {
				eh.Health = true
			} else {
				eh.Error = err.Error()
			}
			hch <- eh
		}(cfg)
	}

	wg.Wait()
	close(hch)

	errs := false
	healthList := []epHealth{}
	for h := range hch {
		healthList = append(healthList, h)
		if h.Error != "" {
			errs = true
		}
	}
	logger.Info("health check for etcd:", healthList)
	if errs {
		logger.Error("unhealthy cluster")
	}
}
