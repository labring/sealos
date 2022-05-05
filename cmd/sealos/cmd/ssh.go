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
	"github.com/labring/sealos/pkg/ssh"
	"github.com/spf13/cobra"
)

var roles string
var clusterName string
var ips []string

func newSSHCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "ssh",
		Short: "ssh tools on all node.",
		//Run: func(cmd *cobra.Command, args []string) {
		//
		//},
	}
	cmd.AddCommand(newSSHExecCmd())
	cmd.AddCommand(newSSHCopyCmd())
	cmd.PersistentFlags().StringVarP(&clusterName, "cluster-name", "c", "default", "submit one cluster name")
	cmd.PersistentFlags().StringVarP(&roles, "roles", "r", "", "set role label to roles")
	cmd.PersistentFlags().StringSliceVar(&ips, "ips", []string{}, "ssh ips list on node")

	return cmd
}

func newSSHExecCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "exec",
		Short: "exec a shell command or script on all node.",
		Example: `
exec to default cluster: default
	sealos ssh exec "cat /etc/hosts"
specify the cluster name(If there is only one cluster in the $HOME/.sealos directory, it should be applied. ):
    sealos ssh exec -c my-cluster "cat /etc/hosts"
set role label to exec cmd:
    sealos exec -c my-cluster -r master,slave,node1 "cat /etc/hosts"	
set ips to exec cmd:
    sealos exec -c my-cluster --ips 172.16.1.38 "cat /etc/hosts"	
`,
		Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(ips) > 0 {
				execCmd, err := ssh.NewExecCmdFromIPs(clusterName, ips)
				if err != nil {
					return err
				}
				return execCmd.RunCmd(args[0])
			}
			execCmd, err := ssh.NewExecCmdFromRoles(clusterName, roles)
			if err != nil {
				return err
			}
			return execCmd.RunCmd(args[0])
		},
	}
	return cmd
}
func newSSHCopyCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:     "copy",
		Aliases: []string{"cp"},
		Short:   "copy local file to remote on all node.",
		Example: `
copy file to default cluster: default
	sealos ssh copy "/root/aa.txt" "/root/dd.txt"
specify the cluster name(If there is only one cluster in the $HOME/.sealos directory, it should be applied. ):
    sealos ssh copy -c my-cluster "/root/aa.txt" "/root/dd.txt"
set role label to copy file:
    sealos ssh copy -c my-cluster -r master,slave,node1 "cat /etc/hosts"	
set ips to copy file:
    sealos ssh copy -c my-cluster --ips 172.16.1.38  "/root/aa.txt" "/root/dd.txt"
`,
		Args: cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(ips) > 0 {
				sshCmd, err := ssh.NewExecCmdFromIPs(clusterName, ips)
				if err != nil {
					return err
				}
				return sshCmd.RunCopy(args[0], args[1])
			}
			sshCmd, err := ssh.NewExecCmdFromRoles(clusterName, roles)
			if err != nil {
				return err
			}
			return sshCmd.RunCopy(args[0], args[1])
		},
	}
	return cmd
}
func init() {
	rootCmd.AddCommand(newSSHCmd())
}
