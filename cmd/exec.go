// Copyright © 2021 sealos.
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

package cmd

import (
	"github.com/spf13/cobra"

	"github.com/fanux/sealos/install"
)

// execCmd represents the exec command
var (
	exampleExecCmd = `
	# exec cmd by label or nodes.  when --label and --node is Exist, get Union of both.
	sealos exec --cmd "mkdir /data" --label node-role.kubernetes.io/master= --node 192.168.0.2
	sealos exec --cmd "mkdir /data" --node 192.168.0.2 --nodes dev-k8s-mater
	
	# exec copy src file to dst by label or nodes. when --label and --node is Exist, get Union of both.
	sealos exec --src /data/foo --dst /root/foo --label node-role.kubernetes.io/master=""
	sealos exec --src /data/foo --dst /root/foo --node 192.168.0.2
`
	execCmd = &cobra.Command{
		Use:     "exec",
		Short:   "support exec cmd or copy file by Label/nodes ",
		Example: exampleExecCmd,
		Run:     ExecCmdFunc,
	}
)

func init() {
	rootCmd.AddCommand(execCmd)
	execCmd.Flags().StringVar(&install.Src, "src", "", "source file location")
	execCmd.Flags().StringVar(&install.Dst, "dst", "", "dest file location")
	execCmd.Flags().StringVar(&install.ExecCommand, "cmd", "", "exec command string")
	execCmd.Flags().StringVar(&install.Label, "label", "", "kubernetes labels like node-role.kubernetes.io/master=")
	execCmd.Flags().StringSliceVar(&install.ExecNode, "node", []string{}, "node ip or hostname in kubernetes")
}

func ExecCmdFunc(cmd *cobra.Command, args []string) {
	e := install.GetExecFlag(cfgFile)
	if e.IsUseCopy() {
		e.Copy()
	}
	if e.IsUseCmd() {
		e.Exec()
	}
}
