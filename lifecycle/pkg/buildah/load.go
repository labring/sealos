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
	"io"
	"os"
	"strings"

	"github.com/containers/common/libimage"
	"github.com/containers/common/pkg/config"
	"github.com/containers/common/pkg/download"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
	"golang.org/x/term"
)

type loadOptions struct {
	input string
	quiet bool
}

func (o *loadOptions) RegisterFlags(fs *pflag.FlagSet) {
	fs.StringVarP(&o.input, "input", "i", "", "load images from specified tar archive file, default(stdin)")
	fs.BoolVarP(&o.quiet, "quiet", "q", false, "suppress the output")
}

func newLoadCommand() *cobra.Command {
	var opts = &loadOptions{}

	loadCommand := &cobra.Command{
		Use:   "load",
		Short: "Load image(s) from archive file",
		RunE: func(cmd *cobra.Command, args []string) error {
			return load(cmd, args, opts)
		},
		Example: fmt.Sprintf(`%[1]s load -i kubernetes.tar`, rootCmd.CommandPath()),
	}
	loadCommand.SetUsageTemplate(UsageTemplate())
	opts.RegisterFlags(loadCommand.Flags())

	return loadCommand
}

func load(cmd *cobra.Command, _ []string, loadOpts *loadOptions) error {
	if len(loadOpts.input) > 0 {
		// Download the input file if needed.
		if strings.HasPrefix(loadOpts.input, "https://") || strings.HasPrefix(loadOpts.input, "http://") {
			containerConfig, err := config.Default()
			if err != nil {
				return err
			}
			tmpdir, err := containerConfig.ImageCopyTmpDir()
			if err != nil {
				return err
			}
			tmpfile, err := download.FromURL(tmpdir, loadOpts.input)
			if err != nil {
				return err
			}
			defer os.Remove(tmpfile)
			loadOpts.input = tmpfile
		}

		if _, err := os.Stat(loadOpts.input); err != nil {
			return err
		}
	} else {
		if term.IsTerminal(int(os.Stdin.Fd())) {
			return errors.New("cannot read from terminal, use command-line redirection or the --input flag")
		}
		outFile, err := os.CreateTemp("", rootCmd.Name())
		if err != nil {
			return fmt.Errorf("creating file %v", err)
		}
		defer os.Remove(outFile.Name())
		defer outFile.Close()

		_, err = io.Copy(outFile, os.Stdin)
		if err != nil {
			return fmt.Errorf("copying file %v", err)
		}
		loadOpts.input = outFile.Name()
	}
	r, err := getRuntime(cmd)
	if err != nil {
		return err
	}
	loadOptions := &libimage.LoadOptions{}
	if !loadOpts.quiet {
		loadOptions.Writer = os.Stderr
	}
	loadedImages, err := r.Load(getContext(), loadOpts.input, loadOptions)
	if err != nil {
		return err
	}
	fmt.Println("Loaded image: " + strings.Join(loadedImages, "\nLoaded image: "))
	return nil
}
