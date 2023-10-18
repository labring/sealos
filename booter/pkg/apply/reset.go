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
	"errors"
	"fmt"

	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/apply/applydrivers"
	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/exec"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
	stringsutil "github.com/labring/sealos/pkg/utils/strings"
)

func NewApplierFromResetArgs(cmd *cobra.Command, args *ResetArgs) (applydrivers.Interface, error) {
	clusterPath := constants.Clusterfile(args.ClusterName)
	cf := clusterfile.NewClusterFile(clusterPath)
	err := cf.Process()
	// incase we want to reset force
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
	if err = c.resetArgs(cmd, args); err != nil {
		return nil, err
	}
	return applydrivers.NewDefaultApplier(cmd.Context(), c.cluster, cf, nil)
}

func (r *ClusterArgs) resetArgs(cmd *cobra.Command, args *ResetArgs) error {
	if args.Cluster.ClusterName == "" {
		return fmt.Errorf("cluster name can not be empty")
	}
	if err := PreProcessIPList(args.Cluster); err != nil {
		return err
	}
	override := getSSHFromCommand(cmd)
	if override != nil {
		ssh.OverSSHConfig(&r.cluster.Spec.SSH, override)
	}

	if len(args.Cluster.Masters) > 0 {
		masters := stringsutil.FilterNonEmptyFromString(args.Cluster.Masters, ",")
		nodes := stringsutil.FilterNonEmptyFromString(args.Cluster.Nodes, ",")
		r.hosts = []v2.Host{}

		sshClient := ssh.NewCacheClientFromCluster(r.cluster, true)
		execer, err := exec.New(sshClient)
		if err != nil {
			return err
		}
		r.setHostWithIpsPort(masters, []string{v2.MASTER, GetHostArch(execer, masters[0])})
		if len(nodes) > 0 {
			r.setHostWithIpsPort(nodes, []string{v2.NODE, GetHostArch(execer, nodes[0])})
		}
		r.cluster.Spec.Hosts = r.hosts
	}

	if r.cluster.ObjectMeta.CreationTimestamp.IsZero() && len(r.cluster.Spec.Hosts) == 0 {
		return errors.New("must specified '--masters' or '--nodes' when clusterfile is not exists")
	}
	logger.Debug("cluster info: %v", r.cluster)
	return nil
}
