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
	"strings"

	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/buildah"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
	strings2 "github.com/labring/sealos/pkg/utils/strings"

	"github.com/labring/sealos/pkg/apply"
	"github.com/labring/sealos/pkg/apply/processor"
)

var exampleRun = `
create cluster to your baremetal server, appoint the iplist:
	sealos run labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
		--nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd xxx
  multi image:
    sealos run labring/kubernetes:v1.24.0 calico:v3.24.1 \
        --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19
  Specify server InfraSSH port :
  All servers use the same InfraSSH port (default port: 22)：
	sealos run labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
	--nodes 192.168.0.5,192.168.0.6,192.168.0.7 --port 24 --passwd xxx
  Different InfraSSH port numbers exist：
	sealos run labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3:23,192.168.0.4:24 \
	--nodes 192.168.0.5:25,192.168.0.6:25,192.168.0.7:27 --passwd xxx
  
  Custom VIP kubernetes cluster:
    sealos run -e defaultVIP=10.103.97.2 labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
	--nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd xxx
  
  Single kubernetes cluster：
	sealos run labring/kubernetes:v1.24.0 --single
  

create a cluster with custom environment variables:
	sealos run -e DashBoardPort=8443 mydashboard:latest  --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
	--nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd xxx
`

func newRunCmd() *cobra.Command {
	runArgs := &apply.RunArgs{
		Cluster: &apply.Cluster{},
		SSH:     &apply.SSH{},
	}
	var runSingle bool
	var runCmd = &cobra.Command{
		Use:     "run",
		Short:   "Run cloud native applications with ease, with or without a existing cluster",
		Long:    `sealos run labring/kubernetes:v1.24.0 --masters [arg] --nodes [arg]`,
		Example: exampleRun,
		RunE: func(cmd *cobra.Command, args []string) error {
			if runSingle {
				addr, _ := iputils.ListLocalHostAddrs()
				runArgs.Masters = iputils.LocalIP(addr)
			}

			images, err := args2Images(args)
			if err != nil {
				return err
			}

			applier, err := apply.NewApplierFromArgs(images, runArgs)
			if err != nil {
				return err
			}
			return applier.Apply()
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			if !strings2.In(buildah.DefaultTransport, []string{buildah.OCIArchive, buildah.DockerArchive}) {
				return fmt.Errorf("transport parameters must be %s or %s", buildah.OCIArchive, buildah.DockerArchive)
			}
			return nil
		},
		PostRun: func(cmd *cobra.Command, args []string) {
			logger.Info(getContact())
		},
	}
	runArgs.RegisterFlags(runCmd.Flags())
	runCmd.Flags().BoolVar(&runSingle, "single", false, "run cluster in single mode")
	runCmd.Flags().BoolVarP(&processor.ForceOverride, "force", "f", false, "force override app in this cluster")
	runCmd.Flags().StringVarP(&buildah.DefaultTransport, "transport", "t", buildah.OCIArchive,
		fmt.Sprintf("load image transport from tar archive file.(optional value: %s, %s)", buildah.OCIArchive, buildah.DockerArchive))
	return runCmd
}

func init() {
	rootCmd.AddCommand(newRunCmd())
}

func args2Images(args []string) ([]string, error) {
	var images []string
	bder, err := buildah.New("")
	if err != nil {
		return images, err
	}
	for _, arg := range args {
		if strings.HasSuffix(arg, ".tar") || strings.HasSuffix(arg, ".gz") {
			id, err := bder.Load(arg)
			if err != nil {
				return images, err
			}
			images = append(images, id)
		} else {
			images = append(images, arg)
		}
	}
	return images, nil
}
