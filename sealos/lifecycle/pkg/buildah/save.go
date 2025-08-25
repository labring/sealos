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

// Mostly copy from github.com/containers/podman

package buildah

import (
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/containers/common/libimage"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
)

type saveOptions struct {
	compress                    bool
	quiet                       bool
	multiImageArchive           bool
	ociAcceptUncompressedLayers bool
	format                      string
	output                      string
}

func (o *saveOptions) RegisterFlags(fs *pflag.FlagSet) {
	fs.BoolVar(&o.compress, "compress", false, "compress tarball image layers when saving to a directory using the 'dir' transport. (default is same compression type as source)")
	fs.BoolVarP(&o.quiet, "quiet", "q", false, "suppress the output")
	fs.BoolVarP(&o.multiImageArchive, "multi-image-archive", "m", false, "interpret additional arguments as images not tags and create a multi-image-archive (only for docker-archive)")
	fs.BoolVar(&o.ociAcceptUncompressedLayers, "uncompressed", false, "Accept uncompressed layers when copying OCI images")
	fs.StringVar(&o.format, "format", OCIArchive, "save image to oci-archive, oci-dir (directory with oci manifest type), "+
		"docker-archive, docker-dir (directory with v2s2 manifest type)")
	fs.StringVarP(&o.output, "output", "o", "", "write to a specified file (default: stdout, which must be redirected)")
}

func (o *saveOptions) Validate() error {
	if strings.Contains(o.output, ":") {
		return fmt.Errorf("invalid filename (should not contain ':') %q", o.output)
	}
	return nil
}

func newSaveCommand() *cobra.Command {
	var opts = &saveOptions{}

	saveCommand := &cobra.Command{
		Use:   "save",
		Short: "Save image into archive file",
		Args:  cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runSave(cmd, args, opts)
		},
		Example: fmt.Sprintf(`%[1]s save -o kubernetes.tar labring/kubernetes:latest`, rootCmd.CommandPath()),
	}
	saveCommand.SetUsageTemplate(UsageTemplate())
	opts.RegisterFlags(saveCommand.Flags())
	_ = saveCommand.MarkFlagRequired("output")

	return saveCommand
}

func runSave(cmd *cobra.Command, args []string, saveOpts *saveOptions) error {
	var (
		tags []string
	)
	if flagChanged(cmd, "compress") && saveOpts.format != DockerManifestDir {
		return errors.New("--compress can only be set when --format is 'docker-dir'")
	}

	if err := saveOpts.Validate(); err != nil {
		return err
	}
	if len(args) > 1 {
		tags = args[1:]
	}

	r, err := getRuntime(cmd)
	if err != nil {
		return err
	}
	saveOptions := &libimage.SaveOptions{}
	saveOptions.DirForceCompress = saveOpts.compress
	saveOptions.OciAcceptUncompressedLayers = saveOpts.ociAcceptUncompressedLayers

	if !saveOpts.quiet {
		saveOptions.Writer = os.Stderr
	}

	names := []string{args[0]}
	if saveOpts.multiImageArchive {
		names = append(names, tags...)
	} else {
		saveOptions.AdditionalTags = tags
	}
	return r.Save(getContext(), names, saveOpts.format, saveOpts.output, saveOptions)
}
