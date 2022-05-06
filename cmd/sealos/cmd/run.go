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
	"github.com/labring/sealos/pkg/apply/processor"
	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/pkg/apply"
	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/spf13/cobra"
)

var contact = `
      ___           ___           ___           ___       ___           ___     
     /\  \         /\  \         /\  \         /\__\     /\  \         /\  \    
    /::\  \       /::\  \       /::\  \       /:/  /    /::\  \       /::\  \   
   /:/\ \  \     /:/\:\  \     /:/\:\  \     /:/  /    /:/\:\  \     /:/\ \  \  
  _\:\~\ \  \   /::\~\:\  \   /::\~\:\  \   /:/  /    /:/  \:\  \   _\:\~\ \  \ 
 /\ \:\ \ \__\ /:/\:\ \:\__\ /:/\:\ \:\__\ /:/__/    /:/__/ \:\__\ /\ \:\ \ \__\
 \:\ \:\ \/__/ \:\~\:\ \/__/ \/__\:\/:/  / \:\  \    \:\  \ /:/  / \:\ \:\ \/__/
  \:\ \:\__\    \:\ \:\__\        \::/  /   \:\  \    \:\  /:/  /   \:\ \:\__\  
   \:\/:/  /     \:\ \/__/        /:/  /     \:\  \    \:\/:/  /     \:\/:/  /  
    \::/  /       \:\__\         /:/  /       \:\__\    \::/  /       \::/  /   
     \/__/         \/__/         \/__/         \/__/     \/__/         \/__/  

                  官方文档：www.sealyun.com
                  项目地址：github.com/labring/sealos
                  QQ   群：98488045
                  常见问题：github.com/labring/sealos/issues
`

var exampleRun = `
create cluster to your baremetal server, appoint the iplist:
	sealos run registry.cn-hongkong.aliyuncs.com/sealyun/oci-kubernetes:1.22.8 --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
		--nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd xxx
  multi image:
    sealos run registry.cn-hongkong.aliyuncs.com/sealyun/oci-kubernetes:1.22.8 registry.cn-hongkong.aliyuncs.com/sealyun/oci-calico:v3.22.1 \ 
        --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19
  Specify server InfraSSH port :
  All servers use the same InfraSSH port (default port: 22)：
	sealos run registry.cn-hongkong.aliyuncs.com/sealyun/oci-kubernetes:1.22.8 --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
	--nodes 192.168.0.5,192.168.0.6,192.168.0.7 --port 24 --passwd xxx
  Different InfraSSH port numbers exist：
	sealos run registry.cn-hongkong.aliyuncs.com/sealyun/oci-kubernetes:1.22.8 --masters 192.168.0.2,192.168.0.3:23,192.168.0.4:24 \
	--nodes 192.168.0.5:25,192.168.0.6:25,192.168.0.7:27 --passwd xxx
  
create a cluster with custom environment variables:
	sealos run -e DashBoardPort=8443 mydashboard:latest  --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
	--nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd xxx
`
var runArgs *apply.RunArgs

func newInitCmd() *cobra.Command {
	var initCmd = &cobra.Command{
		Use:     "run",
		Short:   "Simplest way to run your kubernets HA cluster",
		Long:    `sealos run registry.cn-qingdao.aliyuncs.com/sealos-io/kubernetes:v1.22.0 --masters [arg] --nodes [arg]`,
		Example: exampleRun,
		RunE: func(cmd *cobra.Command, args []string) error {
			applier, err := apply.NewApplierFromArgs(args, runArgs)
			if err != nil {
				return err
			}
			return applier.Apply()
		},
		PostRun: func(cmd *cobra.Command, args []string) {
			logger.Info(contact)
		},
	}
	return initCmd
}

func init() {
	runArgs = &apply.RunArgs{}
	runCmd := newInitCmd()
	rootCmd.AddCommand(runCmd)
	runCmd.Flags().StringVarP(&runArgs.Masters, "masters", "m", "", "set Count or IPList to masters")
	runCmd.Flags().StringVarP(&runArgs.Nodes, "nodes", "n", "", "set Count or IPList to nodes")
	runCmd.Flags().StringVarP(&runArgs.User, "user", "u", v1beta1.DefaultUserRoot, "set baremetal server username")
	runCmd.Flags().StringVarP(&runArgs.Password, "passwd", "p", "", "set cloud provider or baremetal server password")
	runCmd.Flags().Uint16Var(&runArgs.Port, "port", 22, "set the sshd service port number for the server")
	runCmd.Flags().StringVar(&runArgs.Pk, "pk", v1beta1.DefaultPKFile, "set baremetal server private key")
	runCmd.Flags().StringVar(&runArgs.PkPassword, "pk-passwd", "", "set baremetal server private key password")
	runCmd.Flags().StringSliceVar(&runArgs.CustomCMD, "cmd", []string{}, "set cmd for image cmd instruction")
	runCmd.Flags().StringSliceVarP(&runArgs.CustomEnv, "env", "e", []string{}, "set custom environment variables")
	runCmd.Flags().BoolVarP(&processor.ForceOverride, "force", "f", false, "we also can input an --force flag to run app in this cluster by force")
	runCmd.Flags().StringVar(&runArgs.ClusterName, "name", "default", "set cluster name variables")
}
