/*
Copyright 2022 chenchuanle6@gmail.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package cmd

import (
	"encoding/json"
	"os"

	"github.com/labring/sealos/pkg/image"
	"github.com/pkg/errors"
	"github.com/spf13/cobra"
	"golang.org/x/term"
)

var exampleInspect = `
  sealos inspect imageName
  sealos inspect -t app applicationName
`

var inspectType string

func newInspectCmd() *cobra.Command {
	var inspectCmd = &cobra.Command{
		Use:     "inspect",
		Short:   "Inspect the configuration of a application or image",
		Example: exampleInspect,
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(args) == 0 {
				return errors.Errorf("application or image name must be specified")
			}
			if len(args) > 1 {
				return errors.Errorf("too many arguments specified")
			}

			enc := json.NewEncoder(os.Stdout)
			enc.SetIndent("", "    ")
			if term.IsTerminal(int(os.Stdout.Fd())) {
				enc.SetEscapeHTML(false)
			}

			name := args[0]
			switch inspectType {
			case "image":
				imageService, err := image.NewImageService()
				if err != nil {
					return err
				}
				imageList, err := imageService.Inspect(name)
				if err != nil {
					return err
				}
				if len(imageList) == 0 {
					return errors.Errorf("inspect error")
				}
				return enc.Encode(imageList[0])
			case "app":
				clusterService, err := image.NewClusterService()
				if err != nil {
					return err
				}
				clusterManifest, err := clusterService.Inspect(name)
				if err != nil {
					return err
				}
				return enc.Encode(clusterManifest)
			default:
				return errors.Errorf("unknown type %s", inspectType)
			}
		},
	}

	inspectCmd.Flags().StringVarP(&inspectType, "type", "t", "image", "look at the item of the specified type (image or app)")
	return inspectCmd
}

func init() {
	rootCmd.AddCommand(newInspectCmd())
}
