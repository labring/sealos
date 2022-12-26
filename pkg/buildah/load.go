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
	"runtime"

	"github.com/containers/buildah/pkg/parse"
	"github.com/spf13/cobra"
)

func newLoadCommand() *cobra.Command {
	var (
		opts        = newDefaultPullOptions()
		archiveName string
		transport   string
	)

	loadCommand := &cobra.Command{
		Use:   "load",
		Short: "Load image from archive file",
		RunE: func(cmd *cobra.Command, _ []string) error {
			if err := ValidateTransport(transport); err != nil {
				return err
			}
			return pullCmd(cmd, []string{fmt.Sprintf("%s:%s", transport, archiveName)}, opts)
		},
		Example: fmt.Sprintf(`%[1]s load -i kubernetes.tar`, rootCmd.CommandPath()),
	}
	loadCommand.SetUsageTemplate(UsageTemplate())
	fs := loadCommand.Flags()
	fs.String("os", runtime.GOOS, "prefer `OS` instead of the running OS for choosing images")
	fs.String("arch", runtime.GOARCH, "prefer `ARCH` instead of the architecture of the machine for choosing images")
	fs.StringSlice("platform", []string{parse.DefaultPlatform()}, "prefer OS/ARCH instead of the current operating system and architecture for choosing images")
	fs.String("variant", "", "override the `variant` of the specified image")
	fs.StringVarP(&archiveName, "input", "i", "", "load image from tar archive file")
	fs.StringVarP(&transport, "transport", "t", OCIArchive,
		fmt.Sprintf("load image transport from tar archive file. (available options are %s, %s)", OCIArchive, DockerArchive))
	_ = markFlagsHidden(fs, "os", "arch", "platform", "variant")
	_ = loadCommand.MarkFlagRequired("input")
	return loadCommand
}
