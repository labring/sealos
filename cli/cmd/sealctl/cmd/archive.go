// Copyright © 2023 sealos.
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

	"github.com/labring/sealos/pkg/utils/archive"
	"github.com/labring/sealos/pkg/utils/flags"
)

func newTarCmd() *cobra.Command {
	var (
		compressionF flags.Compression
		output       string
		clear        bool
	)
	cmd := &cobra.Command{
		Use:           "tar",
		Short:         "creates an archive file from the directory at `path`, note that this will strip the parent dir",
		Args:          cobra.ExactArgs(1),
		SilenceErrors: true,
		RunE: func(cmd *cobra.Command, args []string) error {
			return archive.Tar(args[0], output, compressionF, clear)
		},
	}
	cmd.Flags().Var(&compressionF, "compression", "compression algorithm, available options are tar/gzip/zstd/disable")
	cmd.Flags().StringVarP(&output, "output", "o", "", "path of archive file")
	cmd.Flags().BoolVar(&clear, "clear", false, "remove source after compression finished")
	_ = cmd.MarkFlagRequired("output")
	_ = cmd.MarkFlagRequired("compression")
	return cmd
}

func newUntarCmd() *cobra.Command {
	var (
		clear  bool
		output string
	)
	cmd := &cobra.Command{
		Use:           "untar",
		Short:         "looks for archive files match glob patterns at filesystem path `src`, and unpacks it at `dst`",
		Args:          cobra.MinimumNArgs(1),
		SilenceErrors: true,
		RunE: func(cmd *cobra.Command, args []string) error {
			return archive.Untar(args, output, clear)
		},
	}
	cmd.Flags().StringVarP(&output, "output", "o", "", "path to uncompress archive files")
	cmd.Flags().BoolVar(&clear, "clear", false, "remove source after uncompression finished")
	_ = cmd.MarkFlagRequired("output")
	return cmd
}

func init() {
	rootCmd.AddCommand(newTarCmd(), newUntarCmd())
}
