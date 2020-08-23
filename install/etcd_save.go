package install

import (
	"context"
	"fmt"
	"github.com/aliyun/aliyun-oss-go-sdk/oss"
	"github.com/wonderivan/logger"
	"go.etcd.io/etcd/clientv3"
	"go.etcd.io/etcd/clientv3/snapshot"
	"go.etcd.io/etcd/etcdserver/api/v3rpc/rpctypes"
	"go.etcd.io/etcd/pkg/transport"
	"go.uber.org/zap"
	"os"
	"path/filepath"
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

	//get oss 。如果AccessKeyId不为空，则读取使命令行，如果为空，load的时候则读取配置文件
	if AccessKeyId != "" {
		e.ObjectPath = ObjectPath
		e.OssEndpoint = OssEndpoint
		e.AccessKeyId = AccessKeyId
		e.AccessKeySecrets = AccessKeySecrets
		e.BucketName = BucketName
	}

	// when backup in docker , add unix timestamp to snapshot
	var u string
	if InDocker {
		u = fmt.Sprintf("%v", time.Now().Unix())
		e.Name = fmt.Sprintf("%s-%s", e.Name, u)
		e.LongName = fmt.Sprintf("%s-%s", e.LongName, u)
	}

	for _, h := range e.Masters {
		ip = reFormatHostToIp(h)
		e.EtcdHosts = append(e.EtcdHosts, ip)
	}
	// snapshot must be requested to one selected node, not multiple.
	endpoint = fmt.Sprintf("%s:2379", reFormatHostToIp(e.Masters[0]))
	e.Endpoints = append(e.Endpoints, endpoint)
	return e
}

func (e *EtcdFlags) Save(inDocker bool) {
	if !FileExist(e.BackDir) {
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
	sp := snapshot.NewV3(lg)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := sp.Save(ctx, *cfg, e.LongName); err != nil {
		logger.Error("snapshot save err: ", err)
		os.Exit(-1)
	}
	logger.Info("Snapshot saved at %s\n", e.LongName)
	// 如果在docker上执行。 落盘在docker容器里面。 判断master节点上是否存在。
	// 如果不存在， 说明在docker容器或者sealos执行的时候， 不在master0上
	if inDocker {
		// 复制本机的snapshot 到 各master节点 上。
		SendPackage(e.LongName, e.EtcdHosts, e.BackDir, nil, nil)
	}
	// trimPathForOss is  trim this  `/sealos//snapshot-1598146449` to   `sealos/snapshot-1598146449`
	e.ObjectPath = trimPathForOss(e.ObjectPath+"/"+e.Name)
	if e.AccessKeyId != "" {
		err := saveToOss(e.OssEndpoint, e.AccessKeyId, e.AccessKeySecrets, e.BucketName, e.ObjectPath, e.LongName)
		if err != nil {
			logger.Error("save to oss err,", err)
			return
		}
		// 如果没有报错， 保存一下最新命令行配置。
		logger.Info("Finished saving/uploading snapshot [%s] on aliyun oss [%s] bucket",e.Name, e.BucketName)
		e.Dump("")
	}
}


func trimPathForOss(path string) string {
	s, _ := filepath.Abs(path)
	return s[1:]
}

func reFormatHostToIp(host string) string {
	if strings.Contains(host, ":") {
		s := strings.Split(host, ":")
		return s[0]
	}
	return host
}

type AliOss struct {
	OssEndpoint      string
	AccessKeyId      string
	AccessKeySecrets string
	BucketName       string
	ObjectPath       string
}

func saveToOss(aliEndpoint, accessKeyId, accessKeySecrets, bucketName, objectName, localFileName string) error {
	ossClient, err := oss.New(aliEndpoint, accessKeyId, accessKeySecrets)
	if err != nil {
		return err
	}
	bucket, err := ossClient.Bucket(bucketName)
	if err != nil {
		return err
	}
	//
	return bucket.PutObjectFromFile(objectName, localFileName)

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
