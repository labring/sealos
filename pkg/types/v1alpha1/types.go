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

package v1alpha1

import (
	"fmt"
	"io/ioutil"
	"os"

	"github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/iputils"

	"github.com/fanux/sealos/pkg/utils/logger"

	"github.com/fanux/sealos/pkg/types/contants"

	"sigs.k8s.io/yaml"
)

const (
	DefaultConfigFile      = "/config.yaml"
	DefaultAPIServerDomain = "apiserver.cluster.local"
)

var (
	DefaultConfigPath = file.UserHomeDir() + "/.sealos"
)

type Metadata struct {
	K8sVersion string `json:"k8sVersion"`
	CniVersion string `json:"cniVersion"`
	CniName    string `json:"cniName"`
}

// SealConfig for ~/.sealos/config.yaml
type SealConfig struct {
	Masters []string `json:"masters"`
	Nodes   []string `json:"nodes"`
	//config from kubeadm.cfg. ex. cluster.local
	DNSDomain         string   `json:"dnsdomain"`
	APIServerCertSANs []string `json:"apiservercertsans"`

	//SSHConfig
	User       string `json:"user"`
	Passwd     string `json:"passwd"`
	PrivateKey string `json:"privatekey"`
	PkPassword string `json:"pkpassword"`
	//ApiServer ex. apiserver.cluster.local
	APIServerDomain string `json:"apiserverdomain"`
	VIP             string `json:"vip"`
	PkgURL          string `json:"pkgurl"`
	Version         string `json:"version"`
	Repo            string `json:"repo"`
	PodCIDR         string `json:"podcidr"`
	SvcCIDR         string `json:"svccidr"`
	//certs location
	CertPath     string `json:"certpath"`
	CertEtcdPath string `json:"certetcdpath"`
	//lvscare images
	LvscareName string `json:"lvscarename"`
}

//Dump is
func (c *SealConfig) Dump(path string) {
	if path == "" {
		path = DefaultConfigPath + DefaultConfigFile
	}
	MasterIPs = iputils.ParseIPs(MasterIPs)
	c.Masters = MasterIPs
	NodeIPs = iputils.ParseIPs(NodeIPs)
	c.Nodes = iputils.ParseIPs(NodeIPs)
	c.User = SSHConfig.User
	c.Passwd = SSHConfig.Password
	c.PrivateKey = SSHConfig.PkFile
	c.PkPassword = SSHConfig.PkPassword
	c.APIServerDomain = APIServer
	c.VIP = VIP
	c.PkgURL = PkgURL
	c.Version = Version
	c.Repo = Repo
	c.SvcCIDR = SvcCIDR
	c.PodCIDR = PodCIDR

	c.DNSDomain = DNSDomain
	c.APIServerCertSANs = APIServerCertSANs
	c.CertPath = CertPath
	c.CertEtcdPath = CertEtcdPath
	//lvscare
	c.LvscareName = LvscareImage
	y, err := yaml.Marshal(c)
	if err != nil {
		logger.Error("dump config file failed: %s", err)
	}

	err = os.MkdirAll(DefaultConfigPath, os.ModePerm)
	if err != nil {
		logger.Warn("create default sealos config dir failed, please create it by your self mkdir -p /root/.sealos && touch /root/.sealos/config.yaml")
	}

	if err = ioutil.WriteFile(path, y, 0644); err != nil {
		logger.Warn("write to file %s failed: %s", path, err)
	}
}

func Dump(path string, content interface{}) error {
	y, err := yaml.Marshal(content)
	if err != nil {
		logger.Error("dump config file failed: %s", err)
		return err
	}
	err = os.MkdirAll(DefaultConfigPath, os.ModePerm)
	if err != nil {
		logger.Error("create dump dir failed %s", err)
		return err
	}

	_ = ioutil.WriteFile(path, y, 0644)
	return nil
}

//Load is
func (c *SealConfig) Load(path string) (err error) {
	if path == "" {
		path = DefaultConfigPath + DefaultConfigFile
	}

	y, err := ioutil.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read config file %s failed %w", path, err)
	}

	err = yaml.Unmarshal(y, c)
	if err != nil {
		return fmt.Errorf("unmarshal config file failed: %w", err)
	}

	MasterIPs = c.Masters
	NodeIPs = c.Nodes
	SSHConfig.User = c.User
	SSHConfig.Password = c.Passwd
	SSHConfig.PkFile = c.PrivateKey
	SSHConfig.PkPassword = c.PkPassword
	APIServer = c.APIServerDomain
	VIP = c.VIP
	PkgURL = c.PkgURL
	Version = c.Version
	Repo = c.Repo
	PodCIDR = c.PodCIDR
	SvcCIDR = c.SvcCIDR
	DNSDomain = c.DNSDomain
	APIServerCertSANs = c.APIServerCertSANs
	CertPath = c.CertPath
	CertEtcdPath = c.CertEtcdPath
	//lvscare
	LvscareImage = c.LvscareName
	return
}

func Load(path string, content interface{}) error {
	y, err := ioutil.ReadFile(path)
	if err != nil {
		logger.Error("read config file %s failed %s", path, err)
		os.Exit(0)
	}

	err = yaml.Unmarshal(y, content)
	if err != nil {
		logger.Error("unmarshal config file failed: %s", err)
	}
	return nil
}

func (c *SealConfig) ShowDefaultConfig() {
	home, _ := os.UserHomeDir()
	c.Masters = []string{"192.168.0.2", "192.168.0.2", "192.168.0.2"}
	c.Nodes = []string{"192.168.0.3", "192.168.0.4"}
	c.User = "root"
	c.Passwd = "123456"
	c.PrivateKey = home + "/.ssh/id_rsa"
	c.APIServerDomain = DefaultAPIServerDomain
	c.VIP = "10.103.97.2"
	c.PkgURL = home + "/kube1.17.13.tar.gz"
	c.Version = "v1.17.13"
	c.Repo = "k8s.gcr.io"
	c.PodCIDR = "100.64.0.0/10"
	c.SvcCIDR = "10.96.0.0/12"
	c.APIServerCertSANs = []string{DefaultAPIServerDomain, "127.0.0.1"}
	c.CertPath = DefaultConfigPath + "/pki"
	c.CertEtcdPath = DefaultConfigPath + "/pki/etcd"
	c.LvscareName = contants.DefaultLvsCareImage

	y, err := yaml.Marshal(c)
	if err != nil {
		logger.Error("marshal config file failed: %s", err)
	}

	logger.Info("\n\n%s\n\n", string(y))
	logger.Info("Please save above config in ~/.sealos/config.yaml and edit values on your own")
}
