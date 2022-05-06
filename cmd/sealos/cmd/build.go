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
	"os"
	"runtime"

	"github.com/labring/sealos/pkg/image/types"

	"github.com/labring/sealos/pkg/image"
	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/spf13/cobra"
)

func newBuildCmd() *cobra.Command {
	var options types.BuildOptions
	var buildCmd = &cobra.Command{
		Use:     "build [flags] PATH",
		Short:   "build an cloud image from a Kubefile",
		Example: `sealos build -t registry.cn-qingdao.aliyuncs.com/oci-kubernetes:1.22.8 .`,
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			var (
				buildContext = "."
			)
			if len(args) != 0 {
				buildContext = args[0]
			}

			imageSvc, err := image.NewImageService()
			if err != nil {
				return err
			}
			return imageSvc.Build(&options, buildContext, options.Tag)
		},
		PostRun: func(cmd *cobra.Command, args []string) {
			logger.Info(contact)
		},
	}
	buildCmd.Flags().StringVarP(&options.File, "kubefile", "f", "Kubefile", "kubefile filepath")
	buildCmd.Flags().StringVarP(&options.Tag, "tag", "t", "", "tagged name to apply to the built image")
	buildCmd.Flags().StringVar(&options.Platform, "platform", fmt.Sprintf("%s/%s", runtime.GOOS, runtime.GOARCH), "set the OS/ARCH/VARIANT of the image to the provided value instead of the current operating system and architecture of the host (for example linux/arm)")
	if err := buildCmd.MarkFlagRequired("tag"); err != nil {
		logger.Error("failed to init flag: %v", err)
		os.Exit(1)
	}
	return buildCmd
}

func init() {
	buildCmd := newBuildCmd()
	rootCmd.AddCommand(buildCmd)
}
