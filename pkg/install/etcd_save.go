// Copyright © 2021 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package install

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"io/ioutil"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/fanux/sealos/pkg/utils/file"

	"github.com/fanux/sealos/pkg/utils/logger"

	v1 "github.com/fanux/sealos/pkg/types/v1alpha1"
	"github.com/fanux/sealos/pkg/utils/ssh"

	clientv3 "go.etcd.io/etcd/client/v3"
	"go.etcd.io/etcd/client/v3/snapshot"
	"go.uber.org/zap"
)

type EtcdFlags struct {
	Name       string
	BackDir    string
	EtcdHosts  []string
	Endpoints  []string
	LongName   string
	RestoreDir string
	v1.SealConfig
}

var ErrPermissionDenied = errors.New("auth: permission denied")

func GetEtcdBackFlags(cfgFile string) *EtcdFlags {
	var (
		ip, endpoint string
	)
	e := &EtcdFlags{}
	if !e.CertFileExist() {
		logger.Error("ETCD CaCert or key file is not exist.")
		os.Exit(1)
	}
	if err := e.Load(cfgFile); err != nil {
		logger.Error(err)
		e.ShowDefaultConfig()
		os.Exit(0)
	}
	// get Etcd host
	e.BackDir = v1.EtcdBackDir
	e.Name = v1.SnapshotName
	e.LongName = fmt.Sprintf("%s/%s", e.BackDir, e.Name)

	// when backup in docker , add unix timestamp to snapshot
	var u string
	if v1.IsK8sMaster {
		u = fmt.Sprintf("%v", time.Now().Unix())
		e.Name = fmt.Sprintf("%s-%s", e.Name, u)
		e.LongName = fmt.Sprintf("%s-%s", e.LongName, u)
	}

	for _, h := range e.Masters {
		ip = reFormatHostToIP(h)
		e.EtcdHosts = append(e.EtcdHosts, ip)
	}
	// snapshot must be requested to one selected node, not multiple.
	endpoint = fmt.Sprintf("%s:2379", reFormatHostToIP(e.Masters[0]))
	e.Endpoints = append(e.Endpoints, endpoint)
	return e
}

func (e *EtcdFlags) Save(isK8sMaster bool) error {
	if !file.IsExist(e.BackDir) {
		err := os.MkdirAll(e.BackDir, os.ModePerm)
		if err != nil {
			logger.Error("mkdir BackDir err: ", err)
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
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := snapshot.Save(ctx, lg, cfg, e.LongName); err != nil {
		logger.Error("snapshot save err: ", err)
		os.Exit(-1)
	}
	logger.Info("Snapshot saved at %s\n", e.LongName)
	// 如果在docker上执行。 落盘在docker容器里面。 判断master节点上是否存在。
	// 如果不存在， 说明在docker容器或者sealos执行的时候， 不在master0上
	if isK8sMaster {
		// 复制本机的snapshot 到 各master节点 上。
		ssh.CopyFiles(v1.SSHConfig, e.LongName, e.EtcdHosts, e.BackDir, nil, nil)
	}
	logger.Info("Finished saving snapshot [%s]", e.Name)
	return nil
}

func reFormatHostToIP(host string) string {
	if strings.Contains(host, ":") {
		s := strings.Split(host, ":")
		return s[0]
	}
	return host
}

func GetCfg(ep []string) (clientv3.Config, error) {
	cert, err := tls.LoadX509KeyPair(v1.EtcdCert, v1.EtcdKey)
	if err != nil {
		return clientv3.Config{}, fmt.Errorf("cacert or key file is not exist, err:%v", err)
	}

	caData, err := ioutil.ReadFile(v1.EtcdCacart)
	if err != nil {
		return clientv3.Config{}, fmt.Errorf("ca certificate reading failed, err:%v", err)
	}

	pool := x509.NewCertPool()
	pool.AppendCertsFromPEM(caData)

	_tlsConfig := &tls.Config{
		Certificates: []tls.Certificate{cert},
		RootCAs:      pool,
	}

	cfg := clientv3.Config{
		Endpoints:   ep,
		DialTimeout: 5 * time.Second,
		TLS:         _tlsConfig,
	}
	cli, err := clientv3.New(cfg)
	if err != nil {
		return clientv3.Config{}, fmt.Errorf("connect to etcd failed, err:%v", err)
	}

	logger.Info("connect to etcd success")

	defer cli.Close()

	return cfg, nil
}

type epHealth struct {
	Ep     string `json:"endpoint"`
	Health bool   `json:"health"`
	Took   string `json:"took"`
	Error  string `json:"error"`
}

func GetHealthFlag(cfgFile string) *EtcdFlags {
	e := &EtcdFlags{}
	if !e.CertFileExist() {
		logger.Error("ETCD CaCert or key file is not exist.")
		os.Exit(1)
	}
	if err := e.Load(cfgFile); err != nil {
		logger.Error(err)
		e.ShowDefaultConfig()
		os.Exit(0)
	}
	for _, h := range e.Masters {
		ip := reFormatHostToIP(h)
		enpoint := fmt.Sprintf("%s:2379", ip)
		e.EtcdHosts = append(e.EtcdHosts, ip)
		e.Endpoints = append(e.Endpoints, enpoint)
	}
	return e
}

func (e *EtcdFlags) HealthCheck() {
	cfgs := []clientv3.Config{}
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
		go func(cfg clientv3.Config) {
			defer wg.Done()
			ep := cfg.Endpoints[0]
			cli, err := clientv3.New(cfg)
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
			if err == nil || err == ErrPermissionDenied {
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

// CertFileExist if cert file is exist return true
func (e *EtcdFlags) CertFileExist() bool {
	return file.IsExist(v1.EtcdCacart) && file.IsExist(v1.EtcdCert) && file.IsExist(v1.EtcdKey)
}
