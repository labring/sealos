package install

import (
	"fmt"
	"github.com/fanux/sealgate/cloud"
	"github.com/wonderivan/logger"
	"os"
)

//VersionURL is base64 encode k8s version and offline package url
// 2019.12.17 三甲医院拔个脚趾甲都不会
/*
   安徽合肥安医附院高新分院，脚趾甲踢翻了，下午四点去的门诊，医生让我去住院楼安排手术，住院楼一个办公室六七个医生无一人敢下手，都说
没做过不会，外面挂了很多锦旗，他们是如何厚着脸皮挂上去的？说是等主任手术完给我做，让我等着，我等了三个小时，担心医生随时会过来我晚饭都不敢
出去吃，最后实在不行了让医生问了下主任什么时候来，医生问完后让我去门诊，本来走路就疼，脚趾甲翻了那酸爽你懂的，我走过去发现门诊已经下班。。。
很难想象一个主任医生如此忽悠一个病人，我又回到住院楼，医生说周一让我来，说刚还没说完我就走了，真是在窝火了。主任叫李韵松，真是个没责任的人
玷污神圣职业。我去投诉部投诉，半天找到，弄了个夜间投诉电话打了三次无人接听，最后换了一个号码，打通了，说去了解下情况，随后回复我，等了一会
后他只是来了一句医生沟通确实有问题表示抱歉。那么我的损失呢？医生的不负责会收到什么处理呢？只回了医院会有相关规定并对应处理，我并不满意，因为
处理不处理我都不知道，最后问我我想咋样，让我白天去找沟通办，我说要去卫健委投诉，他说 随你。。  最后安排我去急诊，急症正在抢救一个病危病人
让我等，果断能理解，然后让护士问了医生急诊能不能拔的了脚趾甲，医生最后回了"拔不了。。"，我真是觉得这些医生三年硕士两年博士念到腿肚子了，这
种小手术做不了还敢去抢救卢内出血的病人？把生命交给你们也太儿戏了吧。
   故事结尾，我在家旁边的小诊所里拔了，十分钟搞定了。
 */
var (
	VersionURL string
	URLmap     map[string]string
	DefaultURL = "37374d999dbadb788ef0461844a70151-1.16.0/kube1.16.0.tar.gz"
	InternalURLPrefix = "https://sealyun.oss-cn-beijing-internal.aliyuncs.com/"
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
var ClusterDir = "~/.sealos/clusters/"

// 2019.11.28 今天刚修完陪产假，在新装修的公寓中写代码，刚配的眼镜感觉带着有点不舒服，看屏幕不是很清楚
/*
   配眼镜的人也不是很专业，二宝还是个女儿，非常可爱而且非常乖，不像大宝那么吵。 一直很想写日记但是不知道往哪里写合适
   既然github要把代码存两千年那为啥不写到代码里，如此这便成为我第一篇代码日记。

   碳纤维地暖开了半天还是冰凉的，感觉是被忽悠了。

   一写代码就精神万分，一搞管理上的杂事就效率很低，所以做技术还是要专注些。
*/
func CloudInstall(c *Cluster) {
	URLmap = make(map[string]string)
	URLmap["v1.16.0"] = InternalURLPrefix + DefaultURL
	URLmap["v1.17.0"] = InternalURLPrefix + "413bd3624b2fb9e466601594b4f72072-1.17.0/kube1.17.0.tar.gz"

	config := c.Config
	p := cloud.NewProvider(config)

	Dump(fmt.Sprintf("%s%s.yaml", ClusterDir, c.Name), c)

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

	Passwd = c.Passwd

	//TODO wget package on master0 and scp to other nodes
	logger.Info("wait few minute for download offline package on master0...")
	cmd := newWgetCommand(c)
	CmdWorkSpace(c.Masters[0].FIP, cmd, "/root")

	// exec sealos init on master0
	cmd = newCommand(c)
	CmdWorkSpace(c.Masters[0].FIP, cmd, "/root")
}

func getURL(version string) string {
	url, ok := URLmap[version]
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
	cmd := fmt.Sprintf("tar zxvf %s && cp ./kube/bin/sealos /usr/bin/", getLocalURL(c.Version))
	cmd += fmt.Sprintf(" && sealos init --passwd %s --pkg-url %s --version %s", c.Passwd, getLocalURL(c.Version), c.Version)
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
