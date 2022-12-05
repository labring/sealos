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
	app_image "github.com/labring/sealos/pkg/image/app-image"
	"github.com/spf13/cobra"
)

func NewPushCmd() *cobra.Command {
	var install bool
	var pushCmd = &cobra.Command{
		Use:     "push",
		Short:   "push cloud image",
		Example: `sealos push labring/kubernetes:v1.24.0`,
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			//registrySvc, err := image.NewRegistryService()
			//if err != nil {
			//	return err
			//}
			//
			//if err = registrySvc.Push(args[0]); err != nil {
			//	return err
			//}
			if install {
				imageCrdBuilder := app_image.NewImageCRDBuilder(args[0])
				if err := imageCrdBuilder.Run(); err != nil {
					return err
				}
			}
			return nil
		},
	}
	pushCmd.Flags().BoolVarP(&install, "install", "i", false, "app install allowed")
	return pushCmd
}
