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

	"github.com/labring/sealos/pkg/apply/applydrivers"
	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
	stringsutil "github.com/labring/sealos/pkg/utils/strings"
)

func NewApplierFromResetArgs(args *ResetArgs) (applydrivers.Interface, error) {
	clusterPath := constants.Clusterfile(args.ClusterName)
	cf := clusterfile.NewClusterFile(clusterPath)
	err := cf.Process()
	if err != nil && err != clusterfile.ErrClusterFileNotExists {
		return nil, err
	}
	cluster := cf.GetCluster()
	if cluster == nil {
		cluster = initCluster(args.ClusterName)
	}
	c := &ClusterArgs{
		clusterName: cluster.Name,
		cluster:     cluster,
	}
	if err = c.resetArgs(args); err != nil {
		return nil, err
	}
	return applydrivers.NewDefaultApplier(c.cluster, cf, nil)
}

func (r *ClusterArgs) resetArgs(args *ResetArgs) error {
	if args.Cluster.ClusterName == "" {
		return fmt.Errorf("cluster name can not be empty")
	}
	if err := PreProcessIPList(args.Cluster); err != nil {
		return err
	}
	if args.fs != nil {
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

	if len(args.Cluster.Masters) > 0 {
		masters := stringsutil.SplitRemoveEmpty(args.Cluster.Masters, ",")
		nodes := stringsutil.SplitRemoveEmpty(args.Cluster.Nodes, ",")
		r.hosts = []v2.Host{}

		clusterSSH := r.cluster.GetSSH()
		sshClient := ssh.NewSSHClient(&clusterSSH, true)

		r.setHostWithIpsPort(masters, []string{v2.MASTER, GetHostArch(sshClient, masters[0])})
		if len(nodes) > 0 {
			r.setHostWithIpsPort(nodes, []string{v2.NODE, GetHostArch(sshClient, nodes[0])})
		}
		r.cluster.Spec.Hosts = r.hosts
	}
	logger.Debug("cluster info: %v", r.cluster)
	return nil
}
