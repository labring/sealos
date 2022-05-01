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

func newRMICmd() *cobra.Command {
	var force bool
	var rmiCmd = &cobra.Command{
		Use:     "rmi",
		Short:   "Remove one or more cloud images",
		Example: `sealos rmi [-f] registry.cn-hongkong.aliyuncs.com/sealyun/oci-kubernetes:1.22.8`,
		Args:    cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			registrySvc, err := image.NewImageService()
			if err != nil {
				return err
			}
			return registrySvc.Remove(force, args...)
		},
	}
	rmiCmd.Flags().BoolVarP(&force, "force", "f", false, "force removal all of the image")
	return rmiCmd
}

func init() {
	rmiCmd := newRMICmd()
	rootCmd.AddCommand(rmiCmd)
}
