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
	"strings"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/pkg/errors"

	"sigs.k8s.io/yaml"

	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/constants"

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
			//output default to be yaml
			if output != "yaml" && output != "json" {
				return errors.New(`--output must be 'yaml' or 'json'`)
			}

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
	OutputInfo := &version.Output{}
	OutputInfo.SealosVersion = version.Get()
	cluster, err := clusterfile.GetClusterFromName(clusterName)
	if err != nil {
		logger.Debug(err, "fail to find cluster from name")
	}
	OutputInfo.KubernetesVersion = version.GetKubernetesVersion(cluster)
	OutputInfo.CriRuntimeVersion = version.GetCriRuntimeVersion()

	switch output {
	case "yaml":
		marshalled, err = yaml.Marshal(&OutputInfo)
		if err != nil {
			return errors.Wrap(err, "fail to marshal yaml")
		}
		fmt.Println(string(marshalled))
	case "json":
		marshalled, err = json.Marshal(&OutputInfo)
		if err != nil {
			return errors.Wrap(err, "fail to marshal json")
		}
		fmt.Println(string(marshalled))
	default:
		// There is a bug in the program if we hit this case.
		// However, we follow a policy of never panicking.
		return fmt.Errorf("VersionOptions were not validated: --output=%q should have been rejected", output)
	}
	missinfo := []string{}
	if OutputInfo.KubernetesVersion == nil {
		missinfo = append(missinfo, "kubernetes version")
	}
	if OutputInfo.CriRuntimeVersion == nil {
		missinfo = append(missinfo, "cri runtime version")
	}
	if OutputInfo.KubernetesVersion == nil || OutputInfo.CriRuntimeVersion == nil {
		fmt.Printf("failed to get %s\ncheck kubernetes status or use commend \"sealos run\" to launch kubernetes\n", strings.Join(missinfo, " and "))
	}

	return nil
}
