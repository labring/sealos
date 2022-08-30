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
	"os"
	"path/filepath"
	"strconv"

	"github.com/labring/sealos/pkg/constants"
	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
	strings2 "github.com/labring/sealos/pkg/utils/strings"

	"github.com/labring/sealos/pkg/apply/applydrivers"
	"github.com/labring/sealos/pkg/clusterfile"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

type ClusterArgs struct {
	cluster     *v2.Cluster
	hosts       []v2.Host
	clusterName string
}

func NewClusterFromArgs(imageName []string, args *RunArgs) (*v2.Cluster, error) {
	cluster := initCluster(args.ClusterName)
	c := &ClusterArgs{
		clusterName: args.ClusterName,
		cluster:     cluster,
	}
	if err := c.SetClusterRunArgs(imageName, args); err != nil {
		return nil, err
	}
	return c.cluster, nil
}

func NewApplierFromArgs(imageName []string, args *RunArgs) (applydrivers.Interface, error) {
	var cluster *v2.Cluster
	clusterPath := constants.Clusterfile(args.ClusterName)
	if !fileutil.IsExist(clusterPath) {
		logger.Debug("creating new cluster")
		cluster = initCluster(args.ClusterName)
	} else {
		logger.Debug("loading from existing cluster")
		clusterFile := clusterfile.NewClusterFile(clusterPath,
			clusterfile.WithCustomConfigFiles(args.CustomConfigFiles))
		err := clusterFile.Process()
		if err != nil {
			return nil, err
		}
		cluster = clusterFile.GetCluster()
		if args.Nodes == "" && args.Masters == "" {
			return applydrivers.NewDefaultApplier(cluster, imageName, args.CustomConfigFiles...)
		}
	}
	c := &ClusterArgs{
		clusterName: args.ClusterName,
		cluster:     cluster,
	}
	if err := c.SetClusterRunArgs(imageName, args); err != nil {
		return nil, err
	}
	return applydrivers.NewDefaultApplier(c.cluster, nil, args.CustomConfigFiles...)
}

func NewApplierFromFile(path string, args *Args) (applydrivers.Interface, error) {
	if !filepath.IsAbs(path) {
		pa, err := os.Getwd()
		if err != nil {
			return nil, err
		}
		path = filepath.Join(pa, path)
	}

	Clusterfile := clusterfile.NewClusterFile(path,
		clusterfile.WithCustomValues(args.Values),
		clusterfile.WithCustomSets(args.Sets),
		clusterfile.WithCustomEnvs(args.CustomEnv),
		clusterfile.WithCustomConfigFiles(args.CustomConfigFiles),
	)
	if err := Clusterfile.Process(); err != nil {
		return nil, err
	}
	cluster := Clusterfile.GetCluster()
	if cluster.Name == "" {
		return nil, fmt.Errorf("cluster name cannot be empty, make sure %s file is correct", path)
	}

	return &applydrivers.Applier{
		ClusterDesired: cluster,
		ClusterFile:    Clusterfile,
		ClusterCurrent: cluster,
		RunNewImages:   nil,
	}, nil
}

func (r *ClusterArgs) SetClusterRunArgs(imageList []string, args *RunArgs) error {
	if len(imageList) == 0 {
		return fmt.Errorf("image can not be empty")
	}
	if args.Cluster.ClusterName == "" {
		return fmt.Errorf("cluster name can not be empty")
	}

	r.cluster.Spec.Env = args.CustomEnv
	r.cluster.Spec.Command = args.CustomCMD
	r.cluster.Spec.SSH.User = args.SSH.User
	r.cluster.Spec.SSH.Pk = args.SSH.Pk
	r.cluster.Spec.SSH.PkPasswd = args.SSH.PkPassword
	r.cluster.Spec.SSH.Port = args.SSH.Port
	if args.SSH.Password != "" {
		r.cluster.Spec.SSH.Passwd = args.SSH.Password
	}

	r.cluster.Spec.Image = imageList
	if err := PreProcessIPList(args.Cluster); err != nil {
		return err
	}

	if len(args.Cluster.Masters) > 0 {
		masters := strings2.SplitRemoveEmpty(args.Cluster.Masters, ",")
		nodes := strings2.SplitRemoveEmpty(args.Cluster.Nodes, ",")
		r.hosts = []v2.Host{}
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
	logger.Debug("cluster info: %v", r.cluster)
	return nil
}

func (r *ClusterArgs) SetClusterResetArgs(args *ResetArgs) error {
	if args.Cluster.ClusterName == "" {
		return fmt.Errorf("cluster name can not be empty")
	}
	r.cluster.Spec.SSH.User = args.SSH.User
	r.cluster.Spec.SSH.Pk = args.SSH.Pk
	r.cluster.Spec.SSH.PkPasswd = args.SSH.PkPassword
	r.cluster.Spec.SSH.Port = args.SSH.Port
	if args.SSH.Password != "" {
		r.cluster.Spec.SSH.Passwd = args.SSH.Password
	}

	if err := PreProcessIPList(args.Cluster); err != nil {
		return err
	}

	if len(args.Cluster.Masters) > 0 {
		masters := strings2.SplitRemoveEmpty(args.Cluster.Masters, ",")
		nodes := strings2.SplitRemoveEmpty(args.Cluster.Nodes, ",")
		r.hosts = []v2.Host{}
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
	logger.Debug("cluster info: %v", r.cluster)
	return nil
}

func (r *ClusterArgs) setHostWithIpsPort(ips []string, roles []string) {
	defaultPort := strconv.Itoa(int(r.cluster.Spec.SSH.Port))
	hostMap := map[string]*v2.Host{}
	for i := range ips {
		ip, port := iputils.GetHostIPAndPortOrDefault(ips[i], defaultPort)
		if _, ok := hostMap[port]; !ok {
			hostMap[port] = &v2.Host{IPS: []string{fmt.Sprintf("%s:%s", ip, port)}, Roles: roles}
			continue
		}
		hostMap[port].IPS = append(hostMap[port].IPS, fmt.Sprintf("%s:%s", ip, port))
	}
	_, master0Port := iputils.GetHostIPAndPortOrDefault(ips[0], defaultPort)
	for port, host := range hostMap {
		host.IPS = removeIPListDuplicatesAndEmpty(host.IPS)
		if port == master0Port && strings2.InList(v2.Master, roles) {
			r.hosts = append([]v2.Host{*host}, r.hosts...)
			continue
		}
		r.hosts = append(r.hosts, *host)
	}
}
