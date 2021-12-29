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
	"fmt"
	"os"
	"strings"

	"github.com/fanux/sealgate/cloud"
	"github.com/fanux/sealos/pkg/logger"
	extver "github.com/linuxsuren/cobra-extension/version"
)

//VersionURL is base64 encode k8s version and offline package url
var (
	VersionURL string
	URLMap     map[string]string
	DefaultURL = "https://sealyun.oss-cn-beijing.aliyuncs.com/37374d999dbadb788ef0461844a70151-1.16.0/kube1.16.0.tar.gz"
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

var C Cluster
var ClusterDir = "/root/.sealos/clusters/"

// 2019.11.28 今天刚修完陪产假，在新装修的公寓中写代码，刚配的眼镜感觉带着有点不舒服，看屏幕不是很清楚
/*
   配眼镜的人也不是很专业，二宝还是个女儿，非常可爱而且非常乖，不像大宝那么吵。 一直很想写日记但是不知道往哪里写合适
   既然github要把代码存两千年那为啥不写到代码里，如此这便成为我第一篇代码日记。

   碳纤维地暖开了半天还是冰凉的，感觉是被忽悠了。

   一写代码就精神万分，一搞管理上的杂事就效率很低，所以做技术还是要专注些。
*/
func CloudInstall(c *Cluster) {
	URLMap = make(map[string]string)
	URLMap["v1.16.0"] = DefaultURL

	config := c.Config
	p := cloud.NewProvider(config)

	_ = Dump(fmt.Sprintf("%s%s.yaml", ClusterDir, c.Name), c)

	//TODO concurrence create master and nodes vms, should not create two vpcs
	/*
		var wg sync.WaitGroup
		wg.Add(2)

		go func() {
			// create masters vms
			res, err := p.Create(newRequest(c, "master", true, c.Master))
			if err != nil {
				logger.Error("init cluster failed: %s", err)
				return
			}
			c.Masters = res.VMs
			c.VPCID = res.VPCID
			c.SwitchID = res.SwitchID
			c.SecuretyGroupID = res.SecuretyGroupID
			wg.Done()
		}()

		go func() {
			// create nodes vms
			res, err := p.Create(newRequest(c, "node", false, c.Node))
			if err != nil {
				logger.Error("init cluster failed: %s", err)
				return
			}
			c.Nodes = res.VMs
			wg.Done()
		}()
		wg.Wait()
	*/
	// create masters vms
	res, err := p.Create(newRequest(c, "master", true, c.Master))
	if err != nil {
		logger.Error("init cluster failed: %s", err)
		return
	}
	c.Masters = res.VMs
	c.VPCID = res.VPCID
	c.SwitchID = res.SwitchID
	c.SecuretyGroupID = res.SecuretyGroupID

	// create nodes vms
	res, err = p.Create(newRequest(c, "node", false, c.Node))
	if err != nil {
		logger.Error("init cluster failed: %s", err)
		return
	}
	c.Nodes = res.VMs

	//TODO wget package on master0 and scp to other nodes
	logger.Info("wait few minute for download offline package on master0...")
	cmd := newWgetCommand(c)
	CmdWorkSpace(c.Masters[0].FIP, cmd, "/root")

	// exec sealos init on master0
	cmd = newCommand(c)
	CmdWorkSpace(c.Masters[0].FIP, cmd, "/root")
}

func getURL(version string) string {
	url, ok := URLMap[version]
	if !ok {
		logger.Error("version offline package not found: %s", version)
		os.Exit(1)
		return DefaultURL
	}
	return url
}

func getLocalURL(version string) string {
	return fmt.Sprintf("/root/kube%s.tar.gz", version[1:])
}

func newCommand(c *Cluster) string {
	//TODO should download it on master0 and copy to other nodes
	version := extver.GetVersion()
	version = strings.TrimPrefix(version, "v")
	releaseURL := fmt.Sprintf("https://github.com/fanux/sealos/releases/download/v%s/sealos_%s_linux_amd64.tar.gz",
		version, version)
	cmd := fmt.Sprintf("wget %s -O -| tar -xz && chmod +x sealos", releaseURL)
	cmd += fmt.Sprintf(" && ./sealos init --passwd %s --pkg-url %s --version %s", c.Passwd, getLocalURL(c.Version), c.Version)
	for _, master := range c.Masters {
		cmd += fmt.Sprintf(" --master %s", master.IP)
	}
	for _, node := range c.Nodes {
		cmd += fmt.Sprintf(" --node %s", node.IP)
	}
	return cmd
}

func newWgetCommand(c *Cluster) string {
	cmd := fmt.Sprintf("cd /root && wget %s", getURL(c.Version))
	return cmd
}

func newRequest(c *Cluster, namePrefix string, fip bool, num int) cloud.Request {
	r := cloud.Request{
		Num:             num,
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

// CmdWorkSpace exec cmd on specified workdir.
func CmdWorkSpace(node, cmd, workdir string) {
	command := fmt.Sprintf("cd %s && %s", workdir, cmd)
	_ = SSHConfig.CmdAsync(node, command)
}
