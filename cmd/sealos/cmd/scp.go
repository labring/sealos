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
	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/ssh"
	"github.com/spf13/cobra"
)

// Shared with exec.go
// var roles string
// var clusterName string
// var ips []string

func newScpCmd() *cobra.Command {
	var cluster *v1beta1.Cluster
	var cmd = &cobra.Command{
		Use: "scp",
		// Aliases: []string{"cp"},
		Short: "copy local file to remote on all node.",
		Example: `
copy file to default cluster: default
	sealos scp "/root/aa.txt" "/root/dd.txt"
specify the cluster name(If there is only one cluster in the $HOME/.sealos directory, it should be applied. ):
    sealos scp -c my-cluster "/root/aa.txt" "/root/dd.txt"
set role label to copy file:
    sealos scp -c my-cluster -r master,slave,node1 "cat /etc/hosts"	
set ips to copy file:
    sealos scp -c my-cluster --ips 172.16.1.38  "/root/aa.txt" "/root/dd.txt"
`,
		Args: cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(ips) > 0 {
				sshCmd, err := ssh.NewExecCmdFromIPs(cluster, ips)
				if err != nil {
					return err
				}
				return sshCmd.RunCopy(args[0], args[1])
			}
			sshCmd, err := ssh.NewExecCmdFromRoles(cluster, roles)
			if err != nil {
				return err
			}
			return sshCmd.RunCopy(args[0], args[1])
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
	cmd.Flags().StringVarP(&clusterName, "cluster-name", "c", "default", "submit one cluster name")
	cmd.Flags().StringVarP(&roles, "roles", "r", "", "set role label to roles")
	cmd.Flags().StringSliceVar(&ips, "ips", []string{}, "ssh ips list on node")
	return cmd
}

func init() {
	rootCmd.AddCommand(newScpCmd())
}
