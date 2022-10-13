package applier

import (
	"fmt"
	"log"
	"strconv"

	cv1 "github.com/labring/sealos/controllers/cluster/api/v1"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/controllers/infra/common"
	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/types/v1beta1"
)

type Applier struct{}

func NewApplier() Reconcile {
	return &Applier{}
}

type Reconcile interface {
	ReconcileCluster(infra *v1.Infra, hosts []v1.Hosts, cluster *cv1.Cluster) error
}

type IP struct {
	PrivateIP string
	PublicIP  string
}

func (a *Applier) ReconcileCluster(infra *v1.Infra, hosts []v1.Hosts, cluster *cv1.Cluster) error {
	//todo 在job中去做，能够实现fmt打印导出到前端
	master := make([]IP, 0)
	node := make([]IP, 0)
	images := getImages(cluster)

	for i := range infra.Spec.Hosts {
		if i >= len(hosts) || infra.Spec.Hosts[i].Count != hosts[i].Count {
			return fmt.Errorf("there is no expected number of instances")
		}
		if getRoleMaster(hosts[i].Roles) {
			for _, j := range hosts[i].Metadata {
				master = append(master, IP{getPrivateIP(j.IP), getPublicIP(j.IP)})
			}
		} else {
			for _, j := range hosts[i].Metadata {
				node = append(node, IP{getPrivateIP(j.IP), getPublicIP(j.IP)})
			}
		}
	}
	if len(master) == 0 {
		return fmt.Errorf("zero master")
	}

	ssh, err := ssh.NewSSHByCluster(&v1beta1.Cluster{Spec: v1beta1.ClusterSpec{SSH: cluster.Spec.SSH}}, true)
	if err != nil {
		return fmt.Errorf("ssh create fail %v", err)
	}
	passwd := cluster.Spec.SSH.Passwd
	if len(node) == 0 {
		if len(master) == 1 {
			// 1 master and zero node -> single
			if err = makeClusterSingle(ssh, master[0].PublicIP, images); err != nil {
				return fmt.Errorf("make cluster single error :%v", err)
			}
			return nil
		}
		return fmt.Errorf("zero node but more than 1 master")
	}

	// >= 1 master and >= 1 node
	sealos := master[0].PublicIP
	for i := 0; i < len(master); i++ {
		ip := master[i].PublicIP
		if err = makeClusterMaster(ssh, ip, passwd, "master"+strconv.Itoa(i)); err != nil {
			return err
		}
	}

	for i := 0; i < len(node); i++ {
		ip := node[i].PublicIP
		if err = makeClusterNode(ssh, ip, passwd, "node"+strconv.Itoa(i)); err != nil {
			return err
		}
	}

	ipMasters, ipNodes := getIPs(master), getIPs(node)

	//sealos run on master
	cmdSealosRun := fmt.Sprintf("sudo sealos run %s --masters %s --nodes %s --passwd %s", images, ipMasters, ipNodes, passwd)
	log.Println(cmdSealosRun)
	if err = ssh.CmdAsync(sealos, cmdSealosRun); err != nil {
		return fmt.Errorf("execute ssh commend %s,fail:%v", cmdSealosRun, err)
	}
	return nil
}

func makeClusterSingle(ssh ssh.Interface, ip, images string) error {
	if err := downLoadSealos(ssh, ip); err != nil {
		return err
	}
	//sealos run on single
	cmdSealosRun := fmt.Sprintf("sudo sealos run %s --single", images)
	if err := ssh.CmdAsync(ip, cmdSealosRun); err != nil {
		return fmt.Errorf("execute commend: %s,error: %v", cmdSealosRun, err)
	}
	return nil
}

// makeClusterNode configure ssh and root password
func makeClusterNode(ssh ssh.Interface, ip, passwd, role string) error {
	if err := setRootPasswd(ssh, ip, passwd); err != nil {
		return err
	}
	if err := setHostNameRole(ssh, ip, role); err != nil {
		return err
	}
	if err := modifySSHConfig(ssh, ip); err != nil {
		return err
	}
	return nil
}

func makeClusterMaster(ssh ssh.Interface, ip, passwd, role string) error {
	if err := makeClusterNode(ssh, ip, passwd, role); err != nil {
		return err
	}
	if err := downLoadSealos(ssh, ip); err != nil {
		return err
	}
	return nil
}

func downLoadSealos(ssh ssh.Interface, ip string) error {
	cmd := "sudo wget -c https://github.com/labring/sealos/releases/download/v4.1.3/sealos_4.1.3_linux_amd64.tar.gz && sudo tar zxvf sealos_4.1.3_linux_amd64.tar.gz sealos && sudo rm -rf sealos_4.1.3_linux_amd64.tar.gz && sudo chmod +x sealos && sudo mv sealos /usr/bin"
	if err := ssh.CmdAsync(ip, cmd); err != nil {
		return fmt.Errorf("execute commend: %s,error: %v", cmd, err)
	}
	return nil
}

func modifySSHConfig(ssh ssh.Interface, ip string) error {
	cmd := "sudo sed -i '63c PasswordAuthentication yes' /etc/ssh/sshd_config && sudo sed -i 's/# StrictHostKeyChecking ask/StrictHostKeyChecking no/' /etc/ssh/ssh_config && sudo systemctl restart sshd"
	if err := ssh.CmdAsync(ip, cmd); err != nil {
		return fmt.Errorf("execute commend: %s,error: %v", cmd, err)
	}
	return nil
}

func setRootPasswd(ssh ssh.Interface, ip string, passwd string) error {
	cmd := fmt.Sprintf("sudo echo -e %s\"\\n\"%s | sudo passwd root", passwd, passwd)
	if err := ssh.CmdAsync(ip, cmd); err != nil {
		return fmt.Errorf("execute commend: %s,error: %v", cmd, err)
	}
	return nil
}

func setHostNameRole(ssh ssh.Interface, ip string, role string) error {
	cmd := fmt.Sprintf("sudo hostnamectl set-hostname %s", role)
	if err := ssh.CmdAsync(ip, cmd); err != nil {
		return fmt.Errorf("execute commend: %s,error: %v", cmd, err)
	}
	return nil
}

func getImages(cluster *cv1.Cluster) string {
	images := ""
	for _, image := range cluster.Spec.Images {
		images += image + " "
	}
	return images
}

func getIPs(ips []IP) string {
	ip := ""
	for i := 0; i < len(ips); i++ {
		if i == len(ips)-1 {
			ip = ip + ips[i].PrivateIP
			break
		}
		ip = ip + ips[i].PrivateIP + ","
	}
	return ip
}

func getRoleMaster(Roles []string) bool {
	for _, j := range Roles {
		if j == "master" {
			return true
		}
	}
	return false
}

func getPrivateIP(ips []v1.IPAddress) string {
	for _, ip := range ips {
		if ip.IPType == common.IPTypePrivate {
			return ip.IPValue
		}
	}
	return ""
}

func getPublicIP(ips []v1.IPAddress) string {
	for _, ip := range ips {
		if ip.IPType == common.IPTypePublic {
			return ip.IPValue
		}
	}
	return ""
}
