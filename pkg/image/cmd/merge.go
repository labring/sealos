// Copyright © 2021 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//	http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package cmd

import (
	"fmt"
	"runtime"
	"strings"

	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/image"
	"github.com/labring/sealos/pkg/image/types"
	"github.com/labring/sealos/pkg/utils/logger"
)

func NewMergeCmd() *cobra.Command {
	var options types.BuildOptions
	var newImageName string
	var policy string
	var mergeCmd = &cobra.Command{
		Use:   "merge",
		Short: "merge multiple images into one",
		Long:  `sealos merge image1:latest image2:latest -i image3:latest`,
		Example: `
merge images:
	sealos merge kubernetes:v1.19.9 mysql:5.7.0 redis:6.0.0 -i new:0.1.0
`,
		Args: cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return image.Merge(newImageName, args, &options, policy)
		},
		PostRun: func(cmd *cobra.Command, args []string) {
			logger.Info("images %s is merged to %s", strings.Join(args, ","), newImageName)
			logger.Info(contact)
		},
	}
	mergeCmd.Flags().StringVarP(&newImageName, "image", "i", "", "image new name")
	mergeCmd.Flags().StringVar(&options.Platform, "platform", fmt.Sprintf("%s/%s", runtime.GOOS, runtime.GOARCH), "set the OS/ARCH/VARIANT of the image to the provided value instead of the current operating system and architecture of the host (for example linux/arm)")
	mergeCmd.Flags().IntVarP(&options.MaxPullProcs, "max-pull-procs", "m", 5, "maximum number of goroutines for pulling")
	mergeCmd.Flags().StringVar(&policy, "policy", "missing", "missing, always, never, ifnewer")
	if err := mergeCmd.MarkFlagRequired("image"); err != nil {
		logger.Error("failed to init flag image: %v", err)
	}
	return mergeCmd
}
