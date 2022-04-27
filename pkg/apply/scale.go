// Copyright © 2021 Alibaba Group Holding Ltd.
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

package apply

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/fanux/sealos/pkg/apply/applydrivers"
	"github.com/fanux/sealos/pkg/clusterfile"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	fileutil "github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/iputils"
	strings2 "github.com/fanux/sealos/pkg/utils/strings"
)

// NewScaleApplierFromArgs will filter ip list from command parameters.
func NewScaleApplierFromArgs(scaleArgs *ScaleArgs, flag string) (applydrivers.Interface, error) {
	var cluster *v2.Cluster
	var curr *v2.Cluster
	clusterPath := contants.Clusterfile(scaleArgs.ClusterName)
	if !fileutil.IsExist(clusterPath) {
		cluster = initCluster(scaleArgs.ClusterName)
		curr = cluster
	} else {
		clusterFile := clusterfile.NewClusterFile(clusterPath)
		err := clusterFile.Process()
		if err != nil {
			return nil, err
		}
		cluster = clusterFile.GetCluster()
		curr = clusterFile.GetCluster().DeepCopy()
	}

	if scaleArgs.Nodes == "" && scaleArgs.Masters == "" {
		return nil, fmt.Errorf("the node or master parameter was not committed")
	}
	var err error
	switch flag {
	case "add":
		err = Join(cluster, scaleArgs.ToRunArgs())
	case "delete":
		err = Delete(cluster, scaleArgs.ToRunArgs())
	}
	if err != nil {
		return nil, err
	}
	return applydrivers.NewDefaultScaleApplier(curr, cluster)
}

func Join(cluster *v2.Cluster, scalingArgs *RunArgs) error {
	return joinNodes(cluster, scalingArgs)
}

func joinNodes(cluster *v2.Cluster, scaleArgs *RunArgs) error {
	if err := PreProcessIPList(scaleArgs); err != nil {
		return err
	}
	if (!IsIPList(scaleArgs.Nodes) && scaleArgs.Nodes != "") || (!IsIPList(scaleArgs.Masters) && scaleArgs.Masters != "") {
		return fmt.Errorf(" Parameter error: The current mode should submit iplist！")
	}

	if scaleArgs.Masters != "" && IsIPList(scaleArgs.Masters) {
		for i := 0; i < len(cluster.Spec.Hosts); i++ {
			role := cluster.Spec.Hosts[i].Roles
			if strings2.InList(v2.MASTER, role) {
				cluster.Spec.Hosts[i].IPS = removeIPListDuplicatesAndEmpty(append(cluster.Spec.Hosts[i].IPS, strings.Split(scaleArgs.Masters, ",")...))
				break
			}
			if i == len(cluster.Spec.Hosts)-1 {
				return fmt.Errorf("not found `master` role from file")
			}
		}
	}
	//add join node
	if scaleArgs.Nodes != "" && IsIPList(scaleArgs.Nodes) {
		for i := 0; i < len(cluster.Spec.Hosts); i++ {
			role := cluster.Spec.Hosts[i].Roles
			if strings2.InList(v2.NODE, role) {
				cluster.Spec.Hosts[i].IPS = removeIPListDuplicatesAndEmpty(append(cluster.Spec.Hosts[i].IPS, strings.Split(scaleArgs.Nodes, ",")...))
				break
			}
			if i == len(cluster.Spec.Hosts)-1 {
				hosts := v2.Host{IPS: removeIPListDuplicatesAndEmpty(strings.Split(scaleArgs.Nodes, ",")), Roles: []string{v2.NODE}}
				cluster.Spec.Hosts = append(cluster.Spec.Hosts, hosts)
			}
		}
	}
	return nil
}

func Delete(cluster *v2.Cluster, scaleArgs *RunArgs) error {
	return deleteNodes(cluster, scaleArgs)
}

func deleteNodes(cluster *v2.Cluster, scaleArgs *RunArgs) error {
	if err := PreProcessIPList(scaleArgs); err != nil {
		return err
	}
	if (!IsIPList(scaleArgs.Nodes) && scaleArgs.Nodes != "") || (!IsIPList(scaleArgs.Masters) && scaleArgs.Masters != "") {
		return fmt.Errorf(" Parameter error: The current mode should submit iplist！")
	}
	//master0 machine cannot be deleted
	if strings2.InList(cluster.GetMaster0IPAndPort(), strings.Split(scaleArgs.Masters, ",")) {
		return fmt.Errorf("master0 machine cannot be deleted")
	}
	defaultPort := strconv.Itoa(int(cluster.Spec.SSH.Port))
	if scaleArgs.Masters != "" && IsIPList(scaleArgs.Masters) {
		for i := range cluster.Spec.Hosts {
			if strings2.InList(v2.MASTER, cluster.Spec.Hosts[i].Roles) {
				cluster.Spec.Hosts[i].IPS = returnFilteredIPList(cluster.Spec.Hosts[i].IPS, strings.Split(scaleArgs.Masters, ","), defaultPort)
			}
		}
	}
	if scaleArgs.Nodes != "" && IsIPList(scaleArgs.Nodes) {
		for i := range cluster.Spec.Hosts {
			if strings2.InList(v2.NODE, cluster.Spec.Hosts[i].Roles) {
				cluster.Spec.Hosts[i].IPS = returnFilteredIPList(cluster.Spec.Hosts[i].IPS, strings.Split(scaleArgs.Nodes, ","), defaultPort)
			}
		}
	}
	return nil
}

func returnFilteredIPList(clusterIPList []string, toBeDeletedIPList []string, defaultPort string) (res []string) {
	toBeDeletedIPList = fillIPAndPort(toBeDeletedIPList, defaultPort)
	for _, ip := range clusterIPList {
		if strings2.NotIn(ip, toBeDeletedIPList) {
			res = append(res, ip)
		}
	}
	return
}

func fillIPAndPort(ipList []string, defaultPort string) []string {
	var ipAndPorts []string
	for _, ip := range ipList {
		targetIP, targetPort := iputils.GetHostIPAndPortOrDefault(ip, defaultPort)
		ipAndPort := fmt.Sprintf("%s:%s", targetIP, targetPort)
		ipAndPorts = append(ipAndPorts, ipAndPort)
	}
	return ipAndPorts
}
