package install

import (
	"fmt"
	"github.com/fanux/sealgate/cloud"
	"github.com/fanux/sealos/version"
	"github.com/wonderivan/logger"
)

//VersionURL is base64 encode k8s version and offline package url
var (
	VersionURL string
	URLmap     map[string]string
	DefaultURL="https://sealyun.oss-cn-beijing.aliyuncs.com/37374d999dbadb788ef0461844a70151-1.16.0/kube1.16.0.tar.gz"
)

//Flags is command line paras
type Flags struct {
	Master      int
	MasterType  string
	Node        int
	NodeType    string
	Version     string
	Flavor      string
	Passwd      string
	Zone        string
	Interaction bool
	Image       string
}

// Cluster is cluster metadata
type Cluster struct {
	cloud.Config
	Flags
	Name            string
	Masters         []cloud.VM
	Nodes           []cloud.VM
	VPCID           string
	SwitchID        string
	SecuretyGroupID string
}

//Global config
var C Cluster

func CloudInstall(c *Cluster) {
	URLmap = make(map[string]string)
	URLmap["v1.16.0"] = DefaultURL

	config := c.Config
	p := cloud.NewProvider(config)

	// create masters vms
	res, err := p.Create(newRequest(c, "master", true))
	if err != nil {
		logger.Error("init cluster failed: %s", err)
		return
	}
	c.Masters = res.VMs
	c.VPCID = res.VPCID
	c.SwitchID = res.SwitchID
	c.SecuretyGroupID = res.SecuretyGroupID

	// create nodes vms
	res, err = p.Create(newRequest(c, "node", false))
	if err != nil {
		logger.Error("init cluster failed: %s", err)
		return
	}
	c.Nodes = res.VMs

	// exec sealos init on master0
	cmd := newCommand(c)
	CmdWorkSpace(c.Masters[0].FIP,cmd,"/root/sealos/cloud")
}

func getURL(version string) string {
	url,ok := URLmap[version]
	if !ok {
		return DefaultURL
	}
	return url
}

func newCommand(c *Cluster) string {
	cmd := fmt.Sprintf("wget https://github.com/fanux/sealos/releases/download/%s/sealos",version.Version)
	cmd += fmt.Sprintf("&& ./sealos init --passwd %s --pkg-url %s --version %s", c.Passwd, getURL(c.Version), c.Version)
	for _,master := range c.Masters {
		cmd += fmt.Sprintf("--master %s", master.IP)
	}
	for _,node := range c.Nodes {
		cmd += fmt.Sprintf("--node %s", node.IP)
	}
	return cmd
}

func newRequest(c *Cluster, namePrefix string, fip bool) cloud.Request {
	r := cloud.Request{
		Num:             c.Flags.Master,
		Image:           c.Flags.Image,
		NamePrefix:      namePrefix,
		FIP:             fip,
		Flavor:          c.Flags.Flavor,
		Passwd:          c.Flags.Passwd,
		ZoneID:          c.Flags.Zone,
		VPCID:           c.VPCID,
		SwitchID:        c.SwitchID,
		SecuretyGroupID: c.SecuretyGroupID,
	}
	return r
}
