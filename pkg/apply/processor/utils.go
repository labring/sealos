package processor

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
)

func TrimHostIp(cluster *v2.Cluster, ip string) error {
	hosts := cluster.Spec.Hosts
	logger.Debug("hosts before trim: %s ", hosts)
	for i := 0; i < len(hosts); i++ {
		ips := hosts[i].IPS
		idx := -1
		for j := 0; j < len(ips); j++ {
			if ip == ips[j] {
				idx = j
			}
		}
		if idx == -1 {
			continue
		}
		logger.Info("trim host ip %s", hosts[i].IPS[idx])
		if len(hosts[i].IPS) == 1 {
			hosts = append(hosts[:i], hosts[i+1:]...)
		} else {
			hosts[i].IPS = append(hosts[i].IPS[:idx], hosts[i].IPS[idx+1:]...)
		}
		break
	}
	logger.Debug("hosts after trim: %s ", hosts)
	cluster.Spec.Hosts = hosts
	return nil
}

func AddMasterIp(cluster *v2.Cluster, ip string) error {
	host := v2.Host{}
	//set host ips
	defaultPort := strconv.Itoa(int(cluster.Spec.SSH.Port))
	ip, port := iputils.GetHostIPAndPortOrDefault(ip, defaultPort)
	host.IPS = []string{fmt.Sprintf("%s:%s", ip, port)}
	//set host roles
	clusterSSH := cluster.GetSSH()
	sshClient := ssh.NewSSHClient(&clusterSSH, true)
	host.Roles = []string{v2.MASTER, GetHostArch(sshClient, ip)}
	//add host to cluster
	cluster.Spec.Hosts = append(cluster.Spec.Hosts, host)
	return nil
}

func AddNodeIp(cluster *v2.Cluster, ip string) error {
	host := v2.Host{}
	//set host ips
	defaultPort := strconv.Itoa(int(cluster.Spec.SSH.Port))
	ip, port := iputils.GetHostIPAndPortOrDefault(ip, defaultPort)
	host.IPS = []string{fmt.Sprintf("%s:%s", ip, port)}
	//set host roles
	clusterSSH := cluster.GetSSH()
	sshClient := ssh.NewSSHClient(&clusterSSH, true)
	host.Roles = []string{v2.NODE, GetHostArch(sshClient, ip)}
	//add host to cluster
	cluster.Spec.Hosts = append(cluster.Spec.Hosts, host)
	return nil
}

// GetHostArch returns the host architecture of the given ip using SSH.
// Note that hosts of the same type(master/node) must have the same architecture,
// so we only need to check the first host of the given type.
func GetHostArch(sshClient ssh.Interface, ip string) string {
	var arch = string(v2.AMD64)

	cmd, err := sshClient.Cmd(ip, "arch")
	if err != nil {
		logger.Error("get host arch failed: %v, defaults to amd64", err)
		return arch
	}
	cmdStr := strings.TrimSpace(string(cmd))
	if cmdStr != "x86_64" {
		arch = string(v2.ARM64)
	}

	return arch
}
