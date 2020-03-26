package install

import (
	"github.com/wonderivan/logger"
	"gopkg.in/yaml.v2"
	"io/ioutil"
	"os"
)

const defaultConfigPath = "/.sealos"
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
	Repo            string
	PodCIDR         string
	SvcCIDR         string
}

//Dump is
func (c *SealConfig) Dump(path string) {
	home, _ := os.UserHomeDir()
	if path == "" {
		path = home + defaultConfigPath + defaultConfigFile
	}

	c.Masters = ParseIPs(MasterIPs)
	c.Nodes = ParseIPs(NodeIPs)
	c.User = SSHConfig.User
	c.Passwd = SSHConfig.Password
	c.PrivateKey = SSHConfig.PkFile
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

	err = os.MkdirAll(home+defaultConfigPath, os.ModePerm)
	if err != nil {
		logger.Warn("create default sealos config dir failed, please create it by your self mkdir -p /root/.sealos && touch /root/.sealos/config.yaml")
	}

	if err = ioutil.WriteFile(path, y, 0644); err != nil{
		logger.Warn("write to file %s failed: %s", path, err)
	}
}

func Dump(path string, content interface{}) error {
	y, err := yaml.Marshal(content)
	if err != nil {
		logger.Error("dump config file failed: %s", err)
		return err
	}
	home, _ := os.UserHomeDir()
	err = os.MkdirAll(home+defaultConfigPath, os.ModePerm)
	if err != nil {
		logger.Error("create dump dir failed %s", err)
		return err
	}

	ioutil.WriteFile(path, y, 0644)
	return nil
}

//Load is
func (c *SealConfig) Load(path string) {
	if path == "" {
		home, _ := os.UserHomeDir()
		path = home + defaultConfigPath + defaultConfigFile
	}

	y, err := ioutil.ReadFile(path)
	if err != nil {
		logger.Error("read config file %s failed %s", path, err)
		c.showDefaultConfig()
		os.Exit(0)
	}

	err = yaml.Unmarshal(y, c)
	if err != nil {
		logger.Error("unmarshal config file failed: %s", err)
	}

	MasterIPs = c.Masters
	NodeIPs = c.Nodes
	SSHConfig.User = c.User
	SSHConfig.Password = c.Passwd
	SSHConfig.PkFile = c.PrivateKey
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
		logger.Error("unmarshal config file failed: %s", err)
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
		logger.Error("marshal config file failed: %s", err)
	}

	logger.Info("\n\n%s\n\n", string(y))
	logger.Info("Please save above config in ~/.sealos/config.yaml and edit values on your own")
}
