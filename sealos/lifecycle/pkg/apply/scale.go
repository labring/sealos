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
	"strings"

	"github.com/spf13/cobra"
	"golang.org/x/exp/slices"
	"k8s.io/apimachinery/pkg/util/sets"

	"github.com/labring/sealos/pkg/apply/applydrivers"
	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/exec"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/iputils"
)

// NewScaleApplierFromArgs will filter ip list from command parameters.
func NewScaleApplierFromArgs(cmd *cobra.Command, scaleArgs *ScaleArgs) (applydrivers.Interface, error) {
	var cluster *v2.Cluster
	clusterPath := constants.Clusterfile(scaleArgs.Cluster.ClusterName)

	if !fileutil.IsExist(clusterPath) {
		cluster = initCluster(scaleArgs.Cluster.ClusterName)
	} else {
		clusterFile := clusterfile.NewClusterFile(clusterPath)
		err := clusterFile.Process()
		if err != nil {
			return nil, err
		}
		cluster = clusterFile.GetCluster()
	}

	curr := cluster.DeepCopy()

	if scaleArgs.Cluster.Nodes == "" && scaleArgs.Cluster.Masters == "" {
		return nil, fmt.Errorf("the node or master parameter was not committed")
	}
	var err error
	switch cmd.Name() {
	case "add":
		err = verifyAndSetNodes(cmd, cluster, scaleArgs)
	case "delete":
		err = Delete(cluster, scaleArgs)
	}
	if err != nil {
		return nil, err
	}

	return applydrivers.NewDefaultScaleApplier(cmd.Context(), curr, cluster)
}

func getSSHFromCommand(cmd *cobra.Command) *v2.SSH {
	var (
		ret     = &v2.SSH{}
		fs      = cmd.Flags()
		changed bool
	)
	if flagChanged(cmd, "user") {
		ret.User, _ = fs.GetString("user")
		changed = true
	}
	if flagChanged(cmd, "passwd") {
		ret.Passwd, _ = fs.GetString("passwd")
		changed = true
	}
	if flagChanged(cmd, "pk") {
		ret.Pk, _ = fs.GetString("pk")
		changed = true
	}
	if flagChanged(cmd, "pk-passwd") {
		ret.PkPasswd, _ = fs.GetString("pk-passwd")
		changed = true
	}
	if flagChanged(cmd, "port") {
		ret.Port, _ = fs.GetUint16("port")
		changed = true
	}
	if changed {
		return ret
	}
	return nil
}

func flagChanged(cmd *cobra.Command, name string) bool {
	if cmd != nil {
		if fs := cmd.Flag(name); fs != nil && fs.Changed {
			return true
		}
	}
	return false
}

func verifyAndSetNodes(cmd *cobra.Command, cluster *v2.Cluster, scaleArgs *ScaleArgs) error {
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

	defaultPort := defaultSSHPort(cluster.Spec.SSH.Port)

	var hosts []v2.Host
	var hasMaster bool
	// check duplicate
	alreadyIn := sets.NewString()
	// add already joined masters and nodes
	for i := range cluster.Spec.Hosts {
		h := cluster.Spec.Hosts[i]
		if slices.Contains(h.Roles, v2.MASTER) {
			hasMaster = true
		}
		ips := iputils.GetHostIPAndPortSlice(h.IPS, defaultPort)
		alreadyIn.Insert(ips...)
		hosts = append(hosts, v2.Host{
			IPS:   ips,
			Roles: h.Roles,
			Env:   h.Env,
			SSH:   h.SSH,
		})
	}
	if !hasMaster {
		return fmt.Errorf("`master` role not found, due to Clusterfile may have been corrupted?")
	}
	override := getSSHFromCommand(cmd)

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
			if !slices.Contains(exclude, addr) {
				addrs = append(addrs, addr)
			}
		}
		if len(addrs) > 0 {
			global := cluster.Spec.SSH.DeepCopy()
			ssh.OverSSHConfig(global, override)

			sshClient := ssh.MustNewClient(global, true)
			execer, err := exec.New(sshClient)
			if err != nil {
				return nil, err
			}
			host := &v2.Host{
				IPS:   addrs,
				Roles: []string{role, GetHostArch(execer, addrs[0])},
			}
			if override != nil {
				host.SSH = override
			}
			return host, nil
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
	if set := strings.Split(masters, ","); len(set) > 0 {
		if slices.Contains(set, cluster.GetMaster0IPAndPort()) || slices.Contains(set, cluster.GetMaster0IP()) {
			return fmt.Errorf("master0 machine cannot be deleted")
		}
	}

	defaultPort := defaultSSHPort(cluster.Spec.SSH.Port)

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
			if slices.Contains(cluster.Spec.Hosts[i].Roles, v2.MASTER) {
				cluster.Spec.Hosts[i].IPS = returnFilteredIPList(cluster.Spec.Hosts[i].IPS, strings.Split(masters, ","), defaultPort)
			}
		}
	}
	if nodes != "" && IsIPList(nodes) {
		for i := range cluster.Spec.Hosts {
			if slices.Contains(cluster.Spec.Hosts[i].Roles, v2.NODE) {
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
		if !slices.Contains(toBeDeletedIPList, ip) {
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
