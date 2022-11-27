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

	"github.com/labring/sealos/pkg/constants"

	"github.com/labring/sealos/pkg/version"

	"github.com/spf13/cobra"
)

var shortPrint bool

func newVersionCmd() *cobra.Command {
	var versionCmd = &cobra.Command{
		Use:     "version",
		Short:   "Print version info",
		Args:    cobra.NoArgs,
		Example: `sealos version`,
		RunE: func(cmd *cobra.Command, args []string) error {
			marshalled, err := json.Marshal(version.Get())
			if err != nil {
				return err
			}
			if shortPrint {
				fmt.Println(version.Get().String())
			} else {
				fmt.Println(string(marshalled))
			}
			return nil
		},
	}
	versionCmd.Flags().BoolVar(&shortPrint, "short", false, "if true, print just the version number.")
	return versionCmd
}

func init() {
	rootCmd.AddCommand(newVersionCmd())
}

func getContact() string {
	return fmt.Sprintf(constants.Contact, version.Get().String())
}
