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
	"github.com/fanux/sealos/pkg/apply/apply_drivers"
	"github.com/fanux/sealos/pkg/clusterfile"
	fileutil "github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/yaml"
	"os"

	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/iputils"
	"github.com/fanux/sealos/pkg/utils/logger"
	strings2 "github.com/fanux/sealos/pkg/utils/strings"
)

type ClusterArgs struct {
	cluster     *v2.Cluster
	hosts       []v2.ClusterHost
	clusterName string
}

func NewApplierFromArgs(imageName string, args RunArgs) (apply_drivers.Interface, error) {
	var cluster *v2.Cluster
	clusterPath := contants.Clusterfile(args.ClusterName)
	if !fileutil.IsExist(clusterPath) {
		cluster = initCluster(args.ClusterName)
	} else {
		clusterFile := clusterfile.NewClusterFile(clusterPath)
		err := clusterFile.Process()
		if err != nil {
			return nil, err
		}
		cluster = clusterFile.GetCluster()
	}
	if args.Nodes == "" && args.Masters == "" {
		return apply_drivers.NewDefaultApplier(cluster)
	}
	c := &ClusterArgs{
		clusterName: args.ClusterName,
	}
	if err := c.SetClusterArgs(imageName, args); err != nil {
		return nil, err
	}
	if err := c.Process(args); err != nil {
		return nil, err
	}
	return apply_drivers.NewDefaultApplier(c.cluster)
}

func (r *ClusterArgs) SetClusterArgs(imageName string, args RunArgs) error {
	if imageName == "" {
		return fmt.Errorf("image can not be empty")
	}
	if args.ClusterName == "" {
		return fmt.Errorf("cluster name can not be empty")
	}

	r.cluster.Spec.SSH.User = args.User
	r.cluster.Spec.SSH.Pk = args.Pk
	r.cluster.Spec.SSH.PkPasswd = args.PkPassword
	r.cluster.Spec.SSH.Port = args.Port
	if args.Password != "" {
		r.cluster.Spec.SSH.Passwd = args.Password
	}

	r.cluster.Spec.Image = imageName

	if err := PreProcessIPList(&args); err != nil {
		return err
	}

	if len(args.Masters) > 0 {
		masters := strings2.SplitRemoveEmpty(args.Masters, ",")
		nodes := strings2.SplitRemoveEmpty(args.Nodes, ",")
		r.hosts = []v2.ClusterHost{}
		if len(masters) != 0 {
			r.setHostWithIpsPort(masters, []string{v2.MASTER, string(v2.AMD64)})
		}
		if len(nodes) != 0 {
			r.setHostWithIpsPort(nodes, []string{v2.NODE, string(v2.AMD64)})
		}
		r.cluster.Spec.Hosts = r.hosts
	} else {
		return fmt.Errorf("enter true iplist, master ip length more than zero")
	}

	return nil
}

func (r *ClusterArgs) Process(args RunArgs) error {
	clusterPath := contants.Clusterfile(args.ClusterName)
	if !args.DryRun {
		logger.Debug("write cluster file to local storage: %s", clusterPath)
		return yaml.MarshalYamlToFile(clusterPath, r.cluster)
	}
	data, err := fileutil.ReadAll(clusterPath)
	if err != nil {
		return err
	}
	_, err = os.Stdout.WriteString(string(data))
	return err
}

func (r *ClusterArgs) setHostWithIpsPort(ips []string, roles []string) {
	hostMap := map[string]*v2.ClusterHost{}
	for i := range ips {
		ip, port := iputils.GetHostIPAndPortOrDefault(ips[i], "22")
		if _, ok := hostMap[port]; !ok {
			hostMap[port] = &v2.ClusterHost{IPS: []string{ip}, Roles: roles}
			continue
		}
		hostMap[port].IPS = append(hostMap[port].IPS, ip)
	}
	_, master0Port := iputils.GetHostIPAndPortOrDefault(ips[0], "22")
	for port, host := range hostMap {
		host.IPS = removeIPListDuplicatesAndEmpty(host.IPS)
		if port == master0Port && strings2.InList(v2.Master, roles) {
			r.hosts = append([]v2.ClusterHost{*host}, r.hosts...)
			continue
		}
		r.hosts = append(r.hosts, *host)
	}
}
