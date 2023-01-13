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

	"github.com/labring/sealos/pkg/apply/applydrivers"
	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
	stringsutil "github.com/labring/sealos/pkg/utils/strings"
)

type ClusterArgs struct {
	cluster     *v2.Cluster
	hosts       []v2.Host
	clusterName string
}

func NewApplierFromArgs(imageName []string, args *RunArgs) (applydrivers.Interface, error) {
	clusterPath := constants.Clusterfile(args.ClusterName)
	cf := clusterfile.NewClusterFile(clusterPath,
		clusterfile.WithCustomConfigFiles(args.CustomConfigFiles),
		clusterfile.WithCustomEnvs(args.CustomEnv),
	)
	err := cf.Process()
	if err != nil && err != clusterfile.ErrClusterFileNotExists {
		return nil, err
	}
	cluster := cf.GetCluster()
	if cluster == nil {
		logger.Debug("creating new cluster")
		cluster = initCluster(args.ClusterName)
	} else {
		cluster = cluster.DeepCopy()
	}
	c := &ClusterArgs{
		clusterName: cluster.Name,
		cluster:     cluster,
	}
	if err = c.runArgs(imageName, args); err != nil {
		return nil, err
	}
	return applydrivers.NewDefaultApplier(c.cluster, cf, imageName)
}

func (r *ClusterArgs) runArgs(imageList []string, args *RunArgs) error {
	if args.Cluster.ClusterName == "" {
		return fmt.Errorf("cluster name can not be empty")
	}
	//the first run check
	if r.cluster.CreationTimestamp.IsZero() {
		if len(imageList) == 0 {
			return fmt.Errorf("image can not be empty")
		}
		if len(args.Cluster.Masters) == 0 {
			return fmt.Errorf("master ip(s) must specified")
		}
	} else {
		if r.cluster.Status.Phase != v2.ClusterSuccess {
			return fmt.Errorf("cluster status is not %s", v2.ClusterSuccess)
		}
	}

	if err := PreProcessIPList(args.Cluster); err != nil {
		return err
	}
	if args.fs != nil {
		if args.fs.Changed("env") || len(r.cluster.Spec.Env) == 0 {
			r.cluster.Spec.Env = make([]string, len(args.CustomEnv))
			copy(r.cluster.Spec.Env, args.CustomEnv)
		}
		if args.fs.Changed("cmd") || len(r.cluster.Spec.Command) == 0 {
			r.cluster.Spec.Command = make([]string, len(args.CustomCMD))
			copy(r.cluster.Spec.Command, args.CustomCMD)
		}
		if args.fs.Changed("user") || r.cluster.Spec.SSH.User == "" {
			r.cluster.Spec.SSH.User = args.SSH.User
		}
		if args.fs.Changed("pk") || r.cluster.Spec.SSH.Pk == "" {
			r.cluster.Spec.SSH.Pk = args.SSH.Pk
		}
		if args.fs.Changed("pk-passwd") || r.cluster.Spec.SSH.PkPasswd == "" {
			r.cluster.Spec.SSH.PkPasswd = args.SSH.PkPassword
		}
		if args.fs.Changed("port") || r.cluster.Spec.SSH.Port == 0 {
			r.cluster.Spec.SSH.Port = args.SSH.Port
		}
		if args.fs.Changed("passwd") || r.cluster.Spec.SSH.Passwd == "" {
			r.cluster.Spec.SSH.Passwd = args.SSH.Password
		}
	}

	r.cluster.SetNewImages(imageList)

	masters := stringsutil.SplitRemoveEmpty(args.Cluster.Masters, ",")
	nodes := stringsutil.SplitRemoveEmpty(args.Cluster.Nodes, ",")
	r.hosts = []v2.Host{}

	clusterSSH := r.cluster.GetSSH()
	sshClient := ssh.NewSSHClient(&clusterSSH, true)
	if len(masters) > 0 {
		r.setHostWithIpsPort(masters, []string{v2.MASTER, GetHostArch(sshClient, masters[0])})
	}
	if len(nodes) > 0 {
		r.setHostWithIpsPort(nodes, []string{v2.NODE, GetHostArch(sshClient, nodes[0])})
	}
	r.cluster.Spec.Hosts = append(r.cluster.Spec.Hosts, r.hosts...)
	logger.Debug("cluster info: %v", r.cluster)
	return nil
}

func (r *ClusterArgs) setHostWithIpsPort(ips []string, roles []string) {
	defaultPort := strconv.Itoa(int(r.cluster.Spec.SSH.Port))
	hostMap := map[string]*v2.Host{}
	for i := range ips {
		ip, port := iputils.GetHostIPAndPortOrDefault(ips[i], defaultPort)
		socket := fmt.Sprintf("%s:%s", ip, port)
		if stringsutil.In(socket, r.cluster.GetAllIPS()) {
			continue
		}
		if _, ok := hostMap[port]; !ok {
			hostMap[port] = &v2.Host{IPS: []string{socket}, Roles: roles}
			continue
		}
		hostMap[port].IPS = append(hostMap[port].IPS, socket)
	}
	_, master0Port := iputils.GetHostIPAndPortOrDefault(ips[0], defaultPort)
	for port, host := range hostMap {
		host.IPS = removeIPListDuplicatesAndEmpty(host.IPS)
		if port == master0Port && stringsutil.InList(v2.Master, roles) {
			r.hosts = append([]v2.Host{*host}, r.hosts...)
			continue
		}
		r.hosts = append(r.hosts, *host)
	}
}
