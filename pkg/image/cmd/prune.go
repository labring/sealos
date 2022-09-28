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
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/image"
)

func NewPruneCmd() *cobra.Command {
	var pruneCmd = &cobra.Command{
		Use:     "prune",
		Short:   "prune image",
		Example: `sealos prune`,
		Args:    cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			registrySvc, err := image.NewImageService()
			if err != nil {
				return err
			}
			return registrySvc.Prune()
		},
	}
	return pruneCmd
}
