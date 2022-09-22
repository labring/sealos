package applier

import (
	"fmt"
	"strconv"

	cv1 "github.com/labring/sealos/controllers/cluster/api/v1"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/exec"
)

type Applier struct{}

func NewApplier() Reconcile {
	return &Applier{}
}

type Reconcile interface {
	ReconcileCluster(infra *v1.Infra, hosts []v1.Hosts, cluster *cv1.Cluster) error
}

func (a *Applier) ReconcileCluster(infra *v1.Infra, hosts []v1.Hosts, cluster *cv1.Cluster) error {
	//todo 在job中去做，能够实现fmt打印导出到前端
	master := make([]string, 0)
	node := make([]string, 0)
	images := getImages(cluster)

	for i := range infra.Spec.Hosts {
		if i >= len(hosts) || infra.Spec.Hosts[i].Count != hosts[i].Count {
			return fmt.Errorf("there is no expected number of instances")
		}
		if getRoleMaster(hosts[i].Roles) {
			for _, j := range hosts[i].Metadata {
				master = append(master, j.IP...)
			}
		} else {
			for _, j := range hosts[i].Metadata {
				node = append(node, j.IP...)
			}
		}
	}
	if len(master) == 0 {
		return fmt.Errorf("zero master")
	}

	ssh, err := ssh.NewSSHByCluster(&v1beta1.Cluster{Spec: v1beta1.ClusterSpec{SSH: infra.Spec.SSH}}, true)
	if err != nil {
		return fmt.Errorf("ssh create fail %v", err)
	}
	passwd := infra.Spec.SSH.Passwd
	if len(node) == 0 {
		if len(master) == 1 {
			// 1 master and zero node
			if err = scpCluster(ssh, master[0], infra.Spec.SSH, "single"); err != nil {
				return fmt.Errorf("scp cluster single error :%v", err)
			}

			if err = makeClusterSingle(ssh, master[0], passwd, "single", images); err != nil {
				return fmt.Errorf("make cluster single error :%v", err)
			}
			return nil
		}
		return fmt.Errorf("zero node but more than 1 master")
	}
	// >= 1 master and >= 1 node
	sealos := master[0]
	for i := 1; i < len(master); i++ {
		ip := master[i]
		if err = scpCluster(ssh, ip, infra.Spec.SSH, "node"); err != nil {
			return fmt.Errorf("scp cluster node error :%v", err)
		}

		err = ssh.CmdAsync(ip, "sudo sh nodeDepl.sh master"+strconv.Itoa(i)+" "+passwd, "")
		if err != nil {
			return fmt.Errorf("execute ssh commend fail:%v", err)
		}
	}
	for i := 0; i < len(node); i++ {
		ip := node[i]
		if err = scpCluster(ssh, ip, infra.Spec.SSH, "node"); err != nil {
			return fmt.Errorf("scp cluster node error :%v", err)
		}

		err = ssh.CmdAsync(ip, "sudo sh nodeDepl.sh node"+strconv.Itoa(i)+" "+passwd, "")
		if err != nil {
			return fmt.Errorf("execute ssh commend fail:%v", err)
		}
	}
	if err = scpCluster(ssh, sealos, infra.Spec.SSH, "master"); err != nil {
		return fmt.Errorf("scp cluster master error :%v", err)
	}
	ipMasters, ipNodes := getIPs(master), getIPs(node)

	fmt.Println("sudo sh masterDepl.sh master0 " + passwd + " " + ipMasters + " " + ipNodes)
	//todo Add images
	err = ssh.CmdAsync(sealos, "sudo sh masterDepl.sh master0 "+passwd+" "+ipMasters+" "+ipNodes, "")
	if err != nil {
		return fmt.Errorf("execute ssh commend fail:%v", err)
	}

	return nil
}

func getImages(cluster *cv1.Cluster) string {
	images := ""
	for _, image := range cluster.Spec.Images {
		images = images + image + " "
	}
	return images
}

func getIPs(ips []string) string {
	ip := ""
	for i := 0; i < len(ips); i++ {
		if i == len(ips)-1 {
			ip = ip + ips[i]
			break
		}
		ip = ip + ips[i] + ","
	}
	return ip
}
func makeClusterSingle(ssh ssh.Interface, ip string, passwd string, role string, images string) error {
	fileName := role + "Depl.sh"
	fmt.Println("sudo sh " + fileName + " master " + passwd)
	err := ssh.CmdAsync(ip, "sudo sh "+fileName+" master "+passwd, "")
	if err != nil {
		return fmt.Errorf("execute ssh commend fail:%v", err)
	}
	return nil
}

func scpCluster(ssh ssh.Interface, ip string, mySSH v1beta1.SSH, role string) error {
	//err = ssh.Copy(master[0], "./singleDepl.sh", "/root")
	//copy singleDepl.sh to des ip

	fileName := role + "Depl.sh"
	pk, user := mySSH.Pk, mySSH.User

	//todo 改用ssh.Copy()
	cmd := fmt.Sprintf("scp -i %s %s %s@%s:/home/%s", pk, fileName, user, ip, user)
	fmt.Println(cmd)
	if err := exec.Cmd("/bin/bash", "-c", cmd); err != nil {
		return fmt.Errorf("execute ssh %s error:%v", cmd, err)
	}
	_ = ssh.CmdAsync(ip, "sudo chmod 0744 "+fileName)
	return nil
}

func getRoleMaster(Roles []string) bool {
	for _, j := range Roles {
		if j == "master" {
			return true
		}
	}
	return false
}
