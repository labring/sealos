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

package cmd

import (
	"context"

	"github.com/spf13/cobra"
	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/exec"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

var clusterName string

var exampleExec = `
exec to default cluster: default
	sealos exec "cat /etc/hosts"
specify the cluster name(If there is only one cluster in the $HOME/.sealos directory, it should be applied. ):
    sealos exec -c my-cluster "cat /etc/hosts"
set role label to exec cmd:
    sealos exec -c my-cluster -r master,node "cat /etc/hosts"
set ips to exec cmd:
    sealos exec -c my-cluster --ips 172.16.1.38 "cat /etc/hosts"
`

func newExecCmd() *cobra.Command {
	var (
		roles   []string
		ips     []string
		cluster *v2.Cluster
	)
	var execCmd = &cobra.Command{
		Use:     "exec",
		Short:   "Execute shell command or script on specified nodes",
		Example: exampleExec,
		Args:    cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			targets := getTargets(cluster, ips, roles)
			return runCommand(cluster, targets, args)
		},
		PreRunE: func(cmd *cobra.Command, args []string) (err error) {
			cluster, err = clusterfile.GetClusterFromName(clusterName)
			return
		},
	}
	execCmd.Flags().StringVarP(&clusterName, "cluster", "c", "default", "name of cluster to run commands")
	execCmd.Flags().StringSliceVarP(&roles, "roles", "r", []string{}, "run command on nodes with role")
	execCmd.Flags().StringSliceVar(&ips, "ips", []string{}, "run command on nodes with ip address")
	return execCmd
}

func getTargets(cluster *v2.Cluster, ips []string, roles []string) []string {
	if len(ips) > 0 {
		return ips
	}
	if len(roles) == 0 {
		return cluster.GetAllIPS()
	}
	var targets []string
	for i := range roles {
		targets = append(targets, cluster.GetIPSByRole(roles[i])...)
	}
	return targets
}

func runCommand(cluster *v2.Cluster, targets []string, args []string) error {
	execer, err := exec.New(ssh.NewCacheClientFromCluster(cluster, true))
	if err != nil {
		return err
	}
	eg, _ := errgroup.WithContext(context.Background())
	for _, ipAddr := range targets {
		ip := ipAddr
		eg.Go(func() error {
			return execer.CmdAsync(ip, args...)
		})
	}
	return eg.Wait()
}
