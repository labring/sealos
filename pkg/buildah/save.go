// Copyright © 2022 buildah.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://github.com/containers/buildah/blob/main/LICENSE
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package buildah

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newSaveCommand() *cobra.Command {
	var (
		opts        = newDefaultPushOptions()
		archiveName string
	)

	saveCommand := &cobra.Command{
		Use:   "save",
		Short: "Save image into archive file",
		RunE: func(cmd *cobra.Command, args []string) error {
			return pushCmd(cmd, []string{
				args[0],
				fmt.Sprintf("%s:%s:%s", DockerArchive, archiveName, args[0]),
			}, opts)
		},
		Example: fmt.Sprintf(`%[1]s save -o kubernetes.tar labring/kubernetes:latest`, rootCmd.Name()),
	}
	saveCommand.SetUsageTemplate(UsageTemplate())

	saveCommand.Flags().StringVarP(&archiveName, "output", "o", "", "save image into tar archive file")
	return saveCommand
}
