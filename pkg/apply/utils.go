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
	"strings"

	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
	stringsutil "github.com/labring/sealos/pkg/utils/strings"

	"k8s.io/apimachinery/pkg/util/sets"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
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
	return stringsutil.RemoveDuplicate(stringsutil.RemoveStrSlice(ipList, []string{""}))
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
