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
	"github.com/labring/sealos/pkg/image"
	"github.com/spf13/cobra"
)

func newPullCmd() *cobra.Command {
	var pullCmd = &cobra.Command{
		Use:     "pull",
		Short:   "pull cloud image",
		Example: `sealos pull registry.cn-hongkong.aliyuncs.com/sealyun/oci-kubernetes:1.22.8`,
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			registrySvc, err := image.NewRegistryService()
			if err != nil {
				return err
			}
			return registrySvc.Pull(args[0])
		},
	}
	return pullCmd
}

func init() {
	pullCmd := newPullCmd()
	rootCmd.AddCommand(pullCmd)
}
