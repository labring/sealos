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

package buildah

import (
	"context"
	"errors"
	"fmt"

	buildahcli "github.com/containers/buildah/pkg/cli"
	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/common/libimage"
	"github.com/hashicorp/go-multierror"
	"github.com/spf13/cobra"
)

type rmiOptions struct {
	all   bool
	prune bool
	force bool
}

func newRMICommand() *cobra.Command {
	var (
		rmiDescription = "\n  Removes one or more locally stored images."
		opts           rmiOptions
	)
	rmiCommand := &cobra.Command{
		Use:     "rmi",
		Aliases: []string{"prune"},
		Short:   "Remove one or more images from local storage",
		Long:    rmiDescription,
		RunE: func(cmd *cobra.Command, args []string) error {
			return rmiCmd(cmd, args, opts)
		},
		Example: fmt.Sprintf(`%[1]s rmi imageID
  %[1]s rmi --all --force
  %[1]s rmi imageID1 imageID2 imageID3`, rootCmd.CommandPath()),
	}
	rmiCommand.SetUsageTemplate(UsageTemplate())

	flags := rmiCommand.Flags()
	flags.SetInterspersed(false)
	flags.BoolVarP(&opts.all, "all", "a", false, "remove all images")
	flags.BoolVarP(&opts.prune, "prune", "p", false, "prune dangling images")
	flags.BoolVarP(&opts.force, "force", "f", false, "force removal of the image and any containers using the image")

	return rmiCommand
}

func rmiCmd(c *cobra.Command, args []string, iopts rmiOptions) error {
	if len(args) == 0 && !iopts.all && !iopts.prune {
		return errors.New("image name or ID must be specified")
	}
	if len(args) > 0 && iopts.all {
		return errors.New("when using the --all switch, you may not pass any images names or IDs")
	}
	if iopts.all && iopts.prune {
		return errors.New("when using the --all switch, you may not use --prune switch")
	}
	if len(args) > 0 && iopts.prune {
		return errors.New("when using the --prune switch, you may not pass any images names or IDs")
	}

	if err := buildahcli.VerifyFlagsArgsOrder(args); err != nil {
		return err
	}

	store, err := getStore(c)
	if err != nil {
		return err
	}

	systemContext, err := parse.SystemContextFromOptions(c)
	if err != nil {
		return err
	}
	runtime, err := libimage.RuntimeFromStore(store, &libimage.RuntimeOptions{SystemContext: systemContext})
	if err != nil {
		return err
	}

	options := &libimage.RemoveImagesOptions{
		Filters: []string{"readonly=false"},
	}
	if iopts.prune {
		options.Filters = append(options.Filters, "dangling=true")
	} else if !iopts.all {
		options.Filters = append(options.Filters, "intermediate=false")
	}
	options.Force = iopts.force

	rmiReports, rmiErrors := runtime.RemoveImages(context.Background(), args, options)
	for _, r := range rmiReports {
		for _, u := range r.Untagged {
			fmt.Printf("untagged: %s\n", u)
		}
	}
	for _, r := range rmiReports {
		if r.Removed {
			fmt.Printf("%s\n", r.ID)
		}
	}

	var multiE *multierror.Error
	multiE = multierror.Append(multiE, rmiErrors...)
	return multiE.ErrorOrNil()
}
