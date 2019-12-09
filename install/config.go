package install

import (
	"github.com/wonderivan/logger"
	"gopkg.in/yaml.v2"
	"io/ioutil"
	"os"
)

const defaultConfigPath = "/root/.sealos"
const defaultConfigFile = "/config.yaml"

// SealConfig for ~/.sealos/config.yaml
type SealConfig struct {
	Masters         []string
	Nodes           []string
	User            string
	Passwd          string
	PrivateKey      string
	ApiServerDomian string
	VIP             string
	PkgURL          string
	Version         string
	Repo 		string
	PodCIDR         string
	SvcCIDR         string
}

//Dump is
func (c *SealConfig) Dump(path string) {
	if path == "" {
		path = defaultConfigPath + defaultConfigFile
	}

	c.Masters = Masters
	c.Nodes = Nodes
	c.User = User
	c.Passwd = Passwd
	c.PrivateKey = PrivateKeyFile
	c.ApiServerDomian = ApiServer
	c.VIP = VIP
	c.PkgURL = PkgUrl
	c.Version = Version
	c.Repo = Repo
	c.SvcCIDR = SvcCIDR
	c.PodCIDR = PodCIDR

	y, err := yaml.Marshal(c)
	if err != nil {
		logger.Error("dump config file failed: %s", err)
	}

	err = os.MkdirAll(defaultConfigPath,os.ModePerm)
	if err != nil {
		logger.Warn("create default sealos config dir failed, please create it by your self mkdir -p /root/.sealos && touch /root/.sealos/config.yaml")
	}

	ioutil.WriteFile(path, y, 0644)
}

func Dump(path string, content interface{}) error{
	y, err := yaml.Marshal(content)
	if err != nil {
		logger.Error("dump config file failed: %s", err)
		return err
	}

	err = os.MkdirAll(defaultConfigPath,os.ModePerm)
	if err != nil {
		logger.Error("create dump dir failed %s",err)
		return err
	}

	ioutil.WriteFile(path, y, 0644)
	return nil
}

//Load is
func (c *SealConfig) Load(path string) {
	if path == "" {
		path = defaultConfigPath + defaultConfigFile
	}

	y, err := ioutil.ReadFile(path)
	if err != nil {
		logger.Error("read config file %s failed %s", path, err)
		c.showDefaultConfig()
		os.Exit(0)
	}

	err = yaml.Unmarshal(y, c)
	if err != nil {
		logger.Error("unmarsha config file failed: %s", err)
	}

	Masters = c.Masters
	Nodes = c.Nodes
	User = c.User
	Passwd = c.Passwd
	PrivateKeyFile = c.PrivateKey
	ApiServer = c.ApiServerDomian
	VIP = c.VIP
	PkgUrl = c.PkgURL
	Version = c.Version
	Repo = c.Repo
	PodCIDR = c.PodCIDR
	PodCIDR = c.SvcCIDR
}

func Load(path string, content interface{}) error {
	y, err := ioutil.ReadFile(path)
	if err != nil {
		logger.Error("read config file %s failed %s", path, err)
		os.Exit(0)
	}

	err = yaml.Unmarshal(y, content)
	if err != nil {
		logger.Error("unmarsha config file failed: %s", err)
	}
	return nil
}

func (c *SealConfig) showDefaultConfig() {
	c.Masters = []string{"192.168.0.2", "192.168.0.2", "192.168.0.2"}
	c.Nodes = []string{"192.168.0.3", "192.168.0.4"}
	c.User = "root"
	c.Passwd = "123"
	c.PrivateKey = "/root/.ssh/id_rsa"
	c.ApiServerDomian = "apiserver.cluster.local"
	c.VIP = "10.103.97.2"
	c.PkgURL = "/root/kube1.14.2.tar.gz"
	c.Version = "v1.14.2"
	c.Repo = "k8s.gcr.io"
	c.PodCIDR = "100.64.0.0/10"
	c.SvcCIDR = "10.96.0.0/12"

	y, err := yaml.Marshal(c)
	if err != nil {
		logger.Error("marsha config file failed: %s", err)
	}

	logger.Info("\n\n%s\n\n", string(y))
	logger.Info("Please save above config in ~/.sealos/config.yaml and edit values on your own")
}
