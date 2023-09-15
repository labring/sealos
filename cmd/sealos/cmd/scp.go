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
	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
)

const exampleScp = `
copy file to default cluster: default
	sealos scp "/root/aa.txt" "/root/dd.txt"
specify the cluster name(If there is only one cluster in the $HOME/.sealos directory, it should be applied. ):
    sealos scp -c my-cluster "/root/aa.txt" "/root/dd.txt"
set role label to copy file:
    sealos scp -c my-cluster -r master,node "cat /etc/hosts"
set ips to copy file:
    sealos scp -c my-cluster --ips 172.16.1.38  "/root/aa.txt" "/root/dd.txt"
`

func newScpCmd() *cobra.Command {
	var (
		roles   []string
		ips     []string
		cluster *v1beta1.Cluster
	)
	var scpCmd = &cobra.Command{
		Use:     "scp",
		Short:   "Copy file to remote on specified nodes",
		Example: exampleScp,
		Args:    cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			targets := getTargets(cluster, ips, roles)
			return runCopy(cluster, targets, args)
		},
		PreRunE: func(cmd *cobra.Command, args []string) (err error) {
			cluster, err = clusterfile.GetClusterFromName(clusterName)
			return
		},
	}
	scpCmd.Flags().StringVarP(&clusterName, "cluster", "c", "default", "name of cluster to run scp action")
	scpCmd.Flags().StringSliceVarP(&roles, "roles", "r", []string{}, "copy file to nodes with role")
	scpCmd.Flags().StringSliceVar(&ips, "ips", []string{}, "copy file to nodes with ip address")
	return scpCmd
}

func runCopy(cluster *v1beta1.Cluster, targets []string, args []string) error {
	execer, err := exec.New(ssh.NewCacheClientFromCluster(cluster, true))
	if err != nil {
		return err
	}
	eg, _ := errgroup.WithContext(context.Background())
	for _, ipAddr := range targets {
		ip := ipAddr
		eg.Go(func() error {
			return execer.Copy(ip, args[0], args[1])
		})
	}
	if err = eg.Wait(); err != nil {
		return err
	}
	logger.Info("transfers files success")
	return nil
}
