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
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/types/v1beta1"
)

var roles string
var clusterName string
var ips []string

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
	var cluster *v1beta1.Cluster
	var execCmd = &cobra.Command{
		Use:     "exec",
		Short:   "Execute shell command or script on specified nodes",
		Example: exampleExec,
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(ips) > 0 {
				execIPCmd, err := ssh.NewExecCmdFromIPs(cluster, ips)
				if err != nil {
					return err
				}
				return execIPCmd.RunCmd(args[0])
			}
			execRoleCmd, err := ssh.NewExecCmdFromRoles(cluster, roles)
			if err != nil {
				return err
			}
			return execRoleCmd.RunCmd(args[0])
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			cls, err := clusterfile.GetClusterFromName(clusterName)
			if err != nil {
				return err
			}
			cluster = cls
			return nil
		},
	}
	execCmd.Flags().StringVarP(&clusterName, "cluster", "c", "default", "name of cluster to applied exec action")
	execCmd.Flags().StringVarP(&roles, "roles", "r", "", "run command on nodes with role")
	execCmd.Flags().StringSliceVar(&ips, "ips", []string{}, "run command on nodes with ip address")
	return execCmd
}

func init() {
	rootCmd.AddCommand(newExecCmd())
}
