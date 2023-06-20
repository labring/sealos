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
	"net"
	"strconv"
	"strings"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/ssh"
	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/iputils"
	strings2 "github.com/labring/sealos/pkg/utils/strings"

	"k8s.io/apimachinery/pkg/util/sets"

	"github.com/labring/sealos/pkg/apply/applydrivers"
	"github.com/labring/sealos/pkg/clusterfile"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

// NewScaleApplierFromArgs will filter ip list from command parameters.
func NewScaleApplierFromArgs(scaleArgs *ScaleArgs, flag string) (applydrivers.Interface, error) {
	var cluster *v2.Cluster
	var curr *v2.Cluster
	clusterPath := constants.Clusterfile(scaleArgs.Cluster.ClusterName)
	if !fileutil.IsExist(clusterPath) {
		cluster = initCluster(scaleArgs.Cluster.ClusterName)
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

	if scaleArgs.Cluster.Nodes == "" && scaleArgs.Cluster.Masters == "" {
		return nil, fmt.Errorf("the node or master parameter was not committed")
	}
	var err error
	switch flag {
	case "add":
		err = Join(cluster, scaleArgs)
	case "delete":
		err = Delete(cluster, scaleArgs)
	}
	if err != nil {
		return nil, err
	}

	return applydrivers.NewDefaultScaleApplier(curr, cluster)
}

func Join(cluster *v2.Cluster, scalingArgs *ScaleArgs) error {
	return joinNodes(cluster, scalingArgs)
}

func joinNodes(cluster *v2.Cluster, scaleArgs *ScaleArgs) error {
	if err := PreProcessIPList(scaleArgs.Cluster); err != nil {
		return err
	}
	masters, nodes := scaleArgs.Cluster.Masters, scaleArgs.Cluster.Nodes
	if len(masters) > 0 {
		if err := validateIPList(masters); err != nil {
			return fmt.Errorf("%s in master list %s", err, masters)
		}
	}
	if len(nodes) > 0 {
		if err := validateIPList(nodes); err != nil {
			return fmt.Errorf("%s in node list %s", err, nodes)
		}
	}

	defaultPort := strconv.Itoa(int(cluster.Spec.SSH.Port))

	var hosts []v2.Host
	var hasMaster bool
	// check duplicate
	alreadyIn := sets.NewString()
	// add already add masters and nodes
	for i := range cluster.Spec.Hosts {
		h := cluster.Spec.Hosts[i]
		if strings2.InList(v2.MASTER, h.Roles) {
			hasMaster = true
		}
		ips := iputils.GetHostIPAndPortSlice(h.IPS, defaultPort)
		alreadyIn.Insert(ips...)
		hosts = append(hosts, v2.Host{
			IPS:   ips,
			Roles: h.Roles,
			Env:   h.Env,
		})
	}
	if !hasMaster {
		return fmt.Errorf("`master` role not found, due to Clusterfile may have been corrupted?")
	}
	getHostFunc := func(sliceStr string, role string, exclude []string) (*v2.Host, error) {
		ss := strings.Split(sliceStr, ",")
		addrs := make([]string, 0)
		for _, s := range ss {
			if s == "" {
				continue
			}
			host, port := iputils.GetHostIPAndPortOrDefault(s, defaultPort)
			addr := net.JoinHostPort(host, port)
			if alreadyIn.Has(addr) {
				return nil, fmt.Errorf("host %s already joined", addr)
			}
			if !strings2.InList(addr, exclude) {
				addrs = append(addrs, addr)
			}
		}
		if len(addrs) > 0 {
			clusterSSH := cluster.GetSSH()
			sshClient := ssh.NewSSHClient(&clusterSSH, true)

			return &v2.Host{
				IPS:   addrs,
				Roles: []string{role, GetHostArch(sshClient, addrs[0])},
			}, nil
		}
		return nil, nil
	}

	if mastersToAdded, err := getHostFunc(masters, v2.MASTER, cluster.GetMasterIPAndPortList()); err != nil {
		return err
	} else if mastersToAdded != nil {
		hosts = append(hosts, *mastersToAdded)
	}
	if nodesToAdded, err := getHostFunc(nodes, v2.NODE, cluster.GetNodeIPAndPortList()); err != nil {
		return err
	} else if nodesToAdded != nil {
		hosts = append(hosts, *nodesToAdded)
	}
	cluster.Spec.Hosts = hosts
	return nil
}

func Delete(cluster *v2.Cluster, scaleArgs *ScaleArgs) error {
	return deleteNodes(cluster, scaleArgs)
}

func deleteNodes(cluster *v2.Cluster, scaleArgs *ScaleArgs) error {
	if err := PreProcessIPList(scaleArgs.Cluster); err != nil {
		return err
	}
	masters, nodes := scaleArgs.Cluster.Masters, scaleArgs.Cluster.Nodes
	if len(masters) > 0 {
		if err := validateIPList(masters); err != nil {
			return fmt.Errorf("%s in master list %s", err, masters)
		}
	}
	if len(nodes) > 0 {
		if err := validateIPList(nodes); err != nil {
			return fmt.Errorf("%s in node list %s", err, nodes)
		}
	}

	//master0 machine cannot be deleted
	if strings2.InList(cluster.GetMaster0IPAndPort(), strings.Split(masters, ",")) ||
		strings2.InList(cluster.GetMaster0IP(), strings.Split(masters, ",")) {
		return fmt.Errorf("master0 machine cannot be deleted")
	}

	defaultPort := strconv.Itoa(int(cluster.Spec.SSH.Port))

	hostsSet := sets.NewString()

	for _, node := range cluster.Spec.Hosts {
		hostsSet.Insert(node.IPS...)
	}
	if nodes != "" {
		for _, node := range strings.Split(nodes, ",") {
			targetIP, targetPort := iputils.GetHostIPAndPortOrDefault(node, defaultPort)
			if !hostsSet.Has(net.JoinHostPort(targetIP, targetPort)) {
				return fmt.Errorf("parameter error: to delete node IP %s:%s must in cluster IP list", targetIP, targetPort)
			}
		}
	}
	if masters != "" {
		for _, node := range strings.Split(masters, ",") {
			targetIP, targetPort := iputils.GetHostIPAndPortOrDefault(node, defaultPort)
			if !hostsSet.Has(net.JoinHostPort(targetIP, targetPort)) {
				return fmt.Errorf("parameter error: to delete master IP %s:%s must in cluster IP list", targetIP, targetPort)
			}
		}
	}

	if masters != "" && IsIPList(masters) {
		for i := range cluster.Spec.Hosts {
			if strings2.InList(v2.MASTER, cluster.Spec.Hosts[i].Roles) {
				cluster.Spec.Hosts[i].IPS = returnFilteredIPList(cluster.Spec.Hosts[i].IPS, strings.Split(masters, ","), defaultPort)
			}
		}
	}
	if nodes != "" && IsIPList(nodes) {
		for i := range cluster.Spec.Hosts {
			if strings2.InList(v2.NODE, cluster.Spec.Hosts[i].Roles) {
				cluster.Spec.Hosts[i].IPS = returnFilteredIPList(cluster.Spec.Hosts[i].IPS, strings.Split(nodes, ","), defaultPort)
			}
		}
	}
	var hosts []v2.Host
	for _, host := range cluster.Spec.Hosts {
		if len(host.IPS) != 0 {
			hosts = append(hosts, host)
		}
	}
	cluster.Spec.Hosts = hosts
	return nil
}

func returnFilteredIPList(clusterIPList []string, toBeDeletedIPList []string, defaultPort string) (res []string) {
	toBeDeletedIPList = fillIPAndPort(toBeDeletedIPList, defaultPort)
	for _, ip := range clusterIPList {
		if !strings2.In(ip, toBeDeletedIPList) {
			res = append(res, net.JoinHostPort(iputils.GetHostIPAndPortOrDefault(ip, defaultPort)))
		}
	}
	return
}

func fillIPAndPort(ipList []string, defaultPort string) []string {
	var ipAndPorts []string
	for _, ip := range ipList {
		if ip == "" {
			continue
		}
		targetIP, targetPort := iputils.GetHostIPAndPortOrDefault(ip, defaultPort)
		ipAndPort := fmt.Sprintf("%s:%s", targetIP, targetPort)
		ipAndPorts = append(ipAndPorts, ipAndPort)
	}
	return ipAndPorts
}
