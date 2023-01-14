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
	"io"
	"os"

	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/apply"
)

var exampleGen = `
generate a cluster with multi images, specify masters and nodes:
    sealos gen labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
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

func newGenCmd() *cobra.Command {
	genArgs := &apply.RunArgs{
		Cluster: &apply.Cluster{},
		SSH:     &apply.SSH{},
	}
	var out string
	var genCmd = &cobra.Command{
		Use:     "gen",
		Short:   "generate a Clusterfile with all default settings",
		Long:    `generate a Clusterfile of the kubernetes cluster, which can be applied by 'sealos apply' command`,
		Example: exampleGen,
		RunE: func(cmd *cobra.Command, args []string) error {
			data, err := apply.NewClusterFromGenArgs(args, genArgs)
			if err != nil {
				return err
			}
			var outputWriter io.WriteCloser
			switch out {
			case "", "stdout":
				outputWriter = os.Stdout
			default:
				outputWriter, err = os.Create(out)
			}
			if err != nil {
				return err
			}
			defer outputWriter.Close()
			_, err = fmt.Fprintln(outputWriter, string(data))
			return err
		},
	}
	genArgs.RegisterFlags(genCmd.Flags())
	genCmd.Flags().StringVarP(&out, "output", "o", "", "print output to named file")
	return genCmd
}

func init() {
	rootCmd.AddCommand(newGenCmd())
}
