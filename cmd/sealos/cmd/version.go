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
	"encoding/json"
	"fmt"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/constants"
	"sigs.k8s.io/yaml"

	"github.com/labring/sealos/pkg/version"

	"github.com/spf13/cobra"
)

var shortPrint bool
var output string

func newVersionCmd() *cobra.Command {
	var versionCmd = &cobra.Command{
		Use:     "version",
		Short:   "Print version info",
		Args:    cobra.NoArgs,
		Example: `sealos version`,
		RunE: func(cmd *cobra.Command, args []string) error {
			if shortPrint {
				fmt.Println(version.Get().String())
				return nil
			}
			if err := PrintInfo(); err != nil {
				return err
			}
			return nil
		},
	}
	versionCmd.Flags().BoolVar(&shortPrint, "short", false, "if true, print just the version number.")
	versionCmd.Flags().StringVarP(&output, "output", "o", "yaml", "One of 'yaml' or 'json'")
	return versionCmd
}

func init() {
	rootCmd.AddCommand(newVersionCmd())
}

func getContact() string {
	return fmt.Sprintf(constants.Contact, version.Get().String())
}

func PrintInfo() error {
	var (
		marshalled []byte
	)
	Output := &version.Output{}
	Output.SealosVersion = version.Get()
	cluster, err := clusterfile.GetClusterFromName(clusterName)
	Output.KubernetesVersion, err = version.GetKubernetesVersion(cluster)
	if err != nil {
		logger.Debug(err)
	}
	Output.CriRuntimeVersion, err = version.GetCriRuntimeVersion()
	if err != nil {
		logger.Debug(err)
	}

	if output == "json" {
		marshalled, err = json.Marshal(&Output)
		if err != nil {
			return err
		}
		fmt.Println(string(marshalled))
		return nil
	}
	marshalled, err = yaml.Marshal(&Output)
	if err != nil {
		return err
	}
	fmt.Printf(string(marshalled))
	return nil
}
