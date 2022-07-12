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

	"github.com/labring/sealos/pkg/image/types"
	"github.com/labring/sealos/pkg/utils/strings"
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/image"
)

func newSaveCmd() *cobra.Command {
	var archiveName string
	var saveCmd = &cobra.Command{
		Use:     "save",
		Short:   "save cloud image to a tar file",
		Example: `sealos save -o kubernetes.tar labring/kubernetes:v1.24.0`,
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			registrySvc, err := image.NewImageService()
			if err != nil {
				return err
			}
			return registrySvc.Save(args[0], archiveName)
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			if strings.NotIn(types.DefaultTransport, []string{types.OCIArchive, types.DockerArchive}) {
				return fmt.Errorf("transport parameters must be %s or %s", types.OCIArchive, types.DockerArchive)
			}
			return nil
		},
	}
	saveCmd.Flags().StringVarP(&archiveName, "output", "o", "", "save image to tar archive file")
	saveCmd.Flags().StringVarP(&types.DefaultTransport, "transport", "t", types.OCIArchive, fmt.Sprintf("save image transport to tar archive file.(optional value: %s , %s)", types.OCIArchive, types.DockerArchive))
	return saveCmd
}

func init() {
	rootCmd.AddCommand(newSaveCmd())
}
