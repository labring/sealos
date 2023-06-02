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
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/cobra/doc"
)

var docsPath string

func newDocsCmd() *cobra.Command {
	var docsCmd = &cobra.Command{
		Use:     "docs",
		Short:   "generate API reference",
		Example: `sealos docs`,
		Args:    cobra.NoArgs,
		PreRunE: func(cmd *cobra.Command, args []string) error {
			return os.MkdirAll(docsPath, 0755)
		},
		RunE: func(cmd *cobra.Command, args []string) error {
			return doc.GenMarkdownTree(rootCmd, docsPath)
		},
	}
	docsCmd.Flags().StringVarP(&docsPath, "path", "p", "./docs/api", "path to output docs")
	return docsCmd
}

func init() {
	rootCmd.AddCommand(newDocsCmd())
}
