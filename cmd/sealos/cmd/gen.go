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
	"fmt"

	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/apply"
	"github.com/labring/sealos/pkg/types/v1beta1"
)

var exampleGen = `
generate a cluster with multi images, specify masters and nodes:
    sealos gen labring/kubernetes:v1.24.0 labring/calico:v3.22.1 \
        --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
        --nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd xxx

specify server InfraSSH port:
  all servers use the same InfraSSH port：
    sealos gen labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
        --nodes 192.168.0.5,192.168.0.6,192.168.0.7 --port 24 --passwd xxx
  different InfraSSH port numbers：
    sealos gen labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3:23,192.168.0.4:24 \
        --nodes 192.168.0.5:25,192.168.0.6:25,192.168.0.7:27 --passwd xxx
`
var genArgs apply.RunArgs

func newGenCmd() *cobra.Command {
	var genCmd = &cobra.Command{
		Use:     "gen",
		Short:   "generate a Clusterfile",
		Long:    `generate a Clusterfile of the kubernetes cluster, which can be applied by 'sealos apply' command`,
		Example: exampleGen,
		RunE: func(cmd *cobra.Command, args []string) error {
			cluster, err := apply.NewClusterFromArgs(args, &genArgs)
			if err != nil {
				return err
			}
			fmt.Println(cluster.String())
			return nil
		},
	}
	genCmd.Flags().StringVarP(&genArgs.Masters, "masters", "m", "", "set Count or IPList to masters")
	genCmd.Flags().StringVarP(&genArgs.Nodes, "nodes", "n", "", "set Count or IPList to nodes")
	genCmd.Flags().StringVarP(&genArgs.User, "user", "u", v1beta1.DefaultUserRoot, "set baremetal server username")
	genCmd.Flags().StringVarP(&genArgs.Password, "passwd", "p", "", "set cloud provider or baremetal server password")
	genCmd.Flags().Uint16Var(&genArgs.Port, "port", 22, "set the sshd service port number for the server")
	genCmd.Flags().StringVar(&genArgs.Pk, "pk", v1beta1.DefaultPKFile, "set baremetal server private key")
	genCmd.Flags().StringVar(&genArgs.PkPassword, "pk-passwd", "", "set baremetal server private key password")
	genCmd.Flags().StringSliceVar(&genArgs.CustomCMD, "cmd", []string{}, "set cmd for image cmd instruction")
	genCmd.Flags().StringSliceVarP(&genArgs.CustomEnv, "env", "e", []string{}, "set custom environment variables")
	genCmd.Flags().StringVar(&genArgs.ClusterName, "name", "default", "set cluster name variables")
	return genCmd
}

func init() {
	rootCmd.AddCommand(newGenCmd())
}
