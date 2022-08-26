// Copyright © 2022 sealos.
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

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/pkg/image"
)

var exampleCreate = `
create a mysql cluster:
	sealos create mysql:8.0
with custom cluster name:
	sealos create mysql:8.0 -c mysql
`

func newCreateCmd() *cobra.Command {
	var createCmd = &cobra.Command{
		Use:     "create",
		Short:   "create a cluster without running the CMD",
		Long:    `sealos create [image name] [args]`,
		Example: exampleCreate,
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			imageName := args[0]
			registrySvc, err := image.NewRegistryService()
			if err != nil {
				return err
			}

			clusterSvc, err := image.NewClusterService()
			if err != nil {
				return err
			}

			err = registrySvc.Pull(imageName)
			if err != nil {
				return err
			}

			manifest, err := clusterSvc.Create(imageName, clusterName)
			if err != nil {
				return err
			}
			logger.Info("Mount point: %s", manifest.MountPoint)

			return nil
		},
	}
	createCmd.Flags().StringVarP(&clusterName, "cluster-name", "c", "default", "name of cluster to be created")
	return createCmd
}

func init() {
	rootCmd.AddCommand(newCreateCmd())
}
