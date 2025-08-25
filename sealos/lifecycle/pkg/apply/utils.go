/*
Copyright 2022 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package apply

import (
	"fmt"
	"net"
	"path/filepath"
	"strings"

	"k8s.io/apimachinery/pkg/util/sets"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/exec"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/hash"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
	stringsutil "github.com/labring/sealos/pkg/utils/strings"
)

func initCluster(clusterName string) *v2.Cluster {
	cluster := &v2.Cluster{}
	cluster.Name = clusterName
	cluster.Kind = "Cluster"
	cluster.APIVersion = v2.SchemeGroupVersion.String()
	cluster.Annotations = make(map[string]string)
	return cluster
}

func PreProcessIPList(joinArgs *Cluster) error {
	masters, err := iputils.ParseIPList(joinArgs.Masters)
	if err != nil {
		return err
	}
	nodes, err := iputils.ParseIPList(joinArgs.Nodes)
	if err != nil {
		return err
	}
	mset := sets.NewString(masters...)
	nset := sets.NewString(nodes...)
	ret := mset.Intersection(nset)
	if len(ret.List()) > 0 {
		return fmt.Errorf("has duplicate ip: %v", ret.List())
	}
	joinArgs.Masters = strings.Join(masters, ",")
	joinArgs.Nodes = strings.Join(nodes, ",")
	return nil
}

func removeIPListDuplicatesAndEmpty(ipList []string) []string {
	return stringsutil.RemoveDuplicate(stringsutil.RemoveSubSlice(ipList, []string{""}))
}

func IsIPList(args string) bool {
	return validateIPList(args) == nil
}

func validateIPList(s string) error {
	list := strings.Split(s, ",")
	for _, i := range list {
		if !strings.Contains(i, ":") {
			if net.ParseIP(i) == nil {
				return fmt.Errorf("invalid IP %s", i)
			}
			continue
		}
		if _, err := net.ResolveTCPAddr("tcp", i); err != nil {
			return fmt.Errorf("invalid TCP address %s", i)
		}
	}
	return nil
}

func getHostArch(execer exec.Interface) func(string) v2.Arch {
	return func(ip string) v2.Arch {
		out, err := execer.Cmd(ip, "arch")
		if err != nil {
			logger.Warn("failed to get host arch: %v, defaults to amd64", err)
			return v2.AMD64
		}
		arch := strings.ToLower(strings.TrimSpace(string(out)))
		switch arch {
		case "x86_64":
			return v2.AMD64
		case "arm64", "aarch64":
			return v2.ARM64
		default:
			panic(fmt.Sprintf("arch %s not yet supported, feel free to file an issue", arch))
		}
	}
}

// GetHostArch returns the host architecture of the given ip using SSH.
// Note that hosts of the same type(master/node) must have the same architecture,
// so we only need to check the first host of the given type.
func GetHostArch(execer exec.Interface, ip string) string {
	return string(getHostArch(execer)(ip))
}

func GetImagesDiff(current, desired []string) []string {
	return stringsutil.RemoveDuplicate(stringsutil.RemoveSubSlice(desired, current))
}

func CompareImageSpecHash(currentImages []string, desiredImages []string) bool {
	currentHash := hash.ToString(currentImages)
	newHash := hash.ToString(desiredImages)

	return currentHash == newHash
}

func GetNewImages(currentCluster, desiredCluster *v2.Cluster) []string {
	if desiredCluster == nil {
		return nil
	}
	if currentCluster == nil {
		return desiredCluster.Spec.Image
	}
	if !CompareImageSpecHash(currentCluster.Spec.Image, desiredCluster.Spec.Image) {
		return GetImagesDiff(currentCluster.Spec.Image, desiredCluster.Spec.Image)
	}
	return nil
}

func CheckAndInitialize(cluster *v2.Cluster) error {
	cluster.Spec.SSH.Port = cluster.Spec.SSH.DefaultPort()

	if cluster.Spec.SSH.Pk == "" {
		cluster.Spec.SSH.Pk = filepath.Join(constants.GetHomeDir(), ".ssh", "id_rsa")
	}

	if len(cluster.Spec.Hosts) == 0 {
		sshClient := ssh.MustNewClient(cluster.Spec.SSH.DeepCopy(), true)
		execer, err := exec.New(sshClient)
		if err != nil {
			return err
		}
		localIpv4 := iputils.GetLocalIpv4()
		defaultPort := defaultSSHPort(cluster.Spec.SSH.Port)
		addr := net.JoinHostPort(localIpv4, defaultPort)

		cluster.Spec.Hosts = append(cluster.Spec.Hosts, v2.Host{
			IPS:   []string{addr},
			Roles: []string{v2.MASTER, GetHostArch(execer, addr)},
		})
	}
	return nil
}
