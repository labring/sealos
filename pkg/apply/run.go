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
	"context"
	"errors"
	"fmt"
	"net"
	"strconv"

	"github.com/spf13/cobra"
	"golang.org/x/exp/slices"

	"github.com/labring/sealos/pkg/apply/applydrivers"
	"github.com/labring/sealos/pkg/apply/processor"
	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/exec"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/maps"
	stringsutil "github.com/labring/sealos/pkg/utils/strings"
)

type ClusterArgs struct {
	cluster     *v2.Cluster
	hosts       []v2.Host
	clusterName string
}

func NewApplierFromArgs(cmd *cobra.Command, args *RunArgs, imageName []string) (applydrivers.Interface, error) {
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
		if args.Masters == "" && args.Nodes == "" {
			addr, _ := iputils.ListLocalHostAddrs()
			args.Masters = iputils.LocalIP(addr)
		}
		cluster = initCluster(args.ClusterName)
	} else {
		cluster = cluster.DeepCopy()
	}
	c := &ClusterArgs{
		clusterName: cluster.Name,
		cluster:     cluster,
	}
	if err = c.runArgs(cmd, args, imageName); err != nil {
		return nil, err
	}

	ctx := withCommonContext(cmd.Context(), cmd)

	return applydrivers.NewDefaultApplier(ctx, c.cluster, cf, imageName)
}

func withCommonContext(ctx context.Context, cmd *cobra.Command) context.Context {
	if flagChanged(cmd, "cmd") {
		v, _ := cmd.Flags().GetStringSlice("cmd")
		ctx = processor.WithCommands(ctx, v)
	}
	if flagChanged(cmd, "env") {
		v, _ := cmd.Flags().GetStringSlice("env")
		ctx = processor.WithEnvs(ctx, maps.FromSlice(v))
	}
	return ctx
}

func (r *ClusterArgs) runArgs(cmd *cobra.Command, args *RunArgs, imageList []string) error {
	if args.Cluster.ClusterName == "" {
		return errors.New("cluster name can not be empty")
	}
	// the first run check
	if r.cluster.CreationTimestamp.IsZero() {
		if len(imageList) == 0 {
			return errors.New("image can not be empty")
		}
		if len(args.Cluster.Masters) == 0 {
			return errors.New("master ip(s) must specified")
		}
	} else {
		if r.cluster.Status.Phase != v2.ClusterSuccess {
			return fmt.Errorf("cluster status is not %s", v2.ClusterSuccess)
		}
	}

	if err := PreProcessIPList(args.Cluster); err != nil {
		return err
	}

	override := getSSHFromCommand(cmd)
	if override != nil {
		r.cluster.Spec.SSH = *override
	}

	r.cluster.SetNewImages(imageList)

	defaultPort := defaultSSHPort(r.cluster.Spec.SSH.Port)
	masters := stringsutil.FilterNonEmptyFromString(args.Cluster.Masters, ",")
	nodes := stringsutil.FilterNonEmptyFromString(args.Cluster.Nodes, ",")
	r.hosts = []v2.Host{}

	sshClient := ssh.NewCacheClientFromCluster(r.cluster, true)
	execer, err := exec.New(sshClient)
	if err != nil {
		return err
	}
	if len(masters) > 0 {
		host, port := iputils.GetHostIPAndPortOrDefault(masters[0], defaultPort)
		master0addr := net.JoinHostPort(host, port)
		r.setHostWithIpsPort(masters, []string{v2.MASTER, GetHostArch(execer, master0addr)})
	}
	if len(nodes) > 0 {
		host, port := iputils.GetHostIPAndPortOrDefault(nodes[0], defaultPort)
		node0addr := net.JoinHostPort(host, port)
		r.setHostWithIpsPort(nodes, []string{v2.NODE, GetHostArch(execer, node0addr)})
	}
	r.cluster.Spec.Hosts = append(r.cluster.Spec.Hosts, r.hosts...)

	return nil
}

func (r *ClusterArgs) setHostWithIpsPort(ips []string, roles []string) {
	defaultPort := defaultSSHPort(r.cluster.Spec.SSH.Port)
	hostMap := map[string]*v2.Host{}
	for i := range ips {
		ip, port := iputils.GetHostIPAndPortOrDefault(ips[i], defaultPort)
		logger.Debug("defaultPort: %s", defaultPort)
		socket := fmt.Sprintf("%s:%s", ip, port)
		if slices.Contains(r.cluster.GetAllIPS(), socket) {
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
		if port == master0Port && slices.Contains(roles, v2.MASTER) {
			r.hosts = append([]v2.Host{*host}, r.hosts...)
			continue
		}
		r.hosts = append(r.hosts, *host)
	}
}

func defaultSSHPort(port uint16) string {
	if port == 0 {
		port = v2.DefaultSSHPort
	}
	return strconv.Itoa(int(port))
}
