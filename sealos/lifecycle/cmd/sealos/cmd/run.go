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
	"fmt"

	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/apply"
	"github.com/labring/sealos/pkg/apply/processor"
	"github.com/labring/sealos/pkg/buildah"
	"github.com/labring/sealos/pkg/utils/logger"
)

var exampleRun = `
create cluster to your baremetal server, appoint the iplist:
	sealos run labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
		--nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd 'xxx'
  multi image:
    sealos run labring/kubernetes:v1.24.0 calico:v3.24.1 \
        --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19
  Specify server InfraSSH port :
  All servers use the same InfraSSH port (default port: 22):
	sealos run labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
	--nodes 192.168.0.5,192.168.0.6,192.168.0.7 --port 24 --passwd 'xxx'
  Different InfraSSH port numbers exist:
	sealos run labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3:23,192.168.0.4:24 \
	--nodes 192.168.0.5:25,192.168.0.6:25,192.168.0.7:27 --passwd 'xxx'
  
  Custom VIP kubernetes cluster:
    sealos run -e defaultVIP=10.103.97.2 labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
	--nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd 'xxx'
  
  Single kubernetes cluster:
	sealos run labring/kubernetes:v1.24.0 --single
  

create a cluster with custom environment variables:
	sealos run -e DashBoardPort=8443 mydashboard:latest  --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
	--nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd 'xxx'
`

func newRunCmd() *cobra.Command {
	runArgs := &apply.RunArgs{
		Cluster: &apply.Cluster{},
		SSH:     &apply.SSH{},
	}
	var transport string
	var runCmd = &cobra.Command{
		Use:     "run",
		Short:   "Run cloud native applications with ease, with or without a existing cluster",
		Long:    `sealos run labring/kubernetes:v1.24.0 --masters [arg] --nodes [arg]`,
		Example: exampleRun,
		RunE: func(cmd *cobra.Command, args []string) error {
			images, err := buildah.PreloadIfTarFile(args, transport)
			if err != nil {
				return err
			}

			applier, err := apply.NewApplierFromArgs(cmd, runArgs, images)
			if err != nil {
				return err
			}
			return applier.Apply()
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			return buildah.ValidateTransport(transport)
		},
		PostRun: func(cmd *cobra.Command, args []string) {
			logger.Info(getContact())
		},
	}
	setRequireBuildahAnnotation(runCmd)
	runArgs.RegisterFlags(runCmd.Flags())
	runCmd.Flags().BoolVar(new(bool), "single", false, "run cluster in single mode")
	if err := runCmd.Flags().MarkDeprecated("single", "it defaults to running cluster in single mode when there are no master and node"); err != nil {
		logger.Fatal(err)
	}
	runCmd.Flags().BoolVarP(&processor.ForceOverride, "force", "f", false, "force override app in this cluster")
	runCmd.Flags().StringVarP(&transport, "transport", "t", buildah.OCIArchive,
		fmt.Sprintf("load image transport from tar archive file.(optional value: %s, %s)", buildah.OCIArchive, buildah.DockerArchive))
	return runCmd
}
