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
	"errors"
	"fmt"
	"os"

	buildahcli "github.com/containers/buildah/pkg/cli"
	"github.com/containers/storage"
	"github.com/spf13/cobra"
)

func newUmountCommand() *cobra.Command {
	umountCommand := &cobra.Command{
		Use:     "umount",
		Aliases: []string{"unmount"},
		Hidden:  true,
		Short:   "Unmount the root file system of the specified working containers",
		Long:    "Unmounts the root file system of the specified working containers.",
		RunE:    umountCmd,
		Example: fmt.Sprintf(`%[1]s umount containerID
  %[1]s umount containerID1 containerID2 containerID3
  %[1]s umount --all`, rootCmd.CommandPath()),
	}
	umountCommand.SetUsageTemplate(UsageTemplate())

	flags := umountCommand.Flags()
	flags.SetInterspersed(false)
	flags.BoolP("all", "a", false, "umount all of the currently mounted containers")
	return umountCommand
}

func umountCmd(c *cobra.Command, args []string) error {
	umountAll := false
	if flagChanged(c, "all") {
		umountAll = true
	}
	if len(args) == 0 && !umountAll {
		return errors.New("at least one container ID must be specified")
	}
	if len(args) > 0 && umountAll {
		return errors.New("when using the --all switch, you may not pass any container IDs")
	}
	if err := buildahcli.VerifyFlagsArgsOrder(args); err != nil {
		return err
	}

	store, err := getStore(c)
	if err != nil {
		return err
	}
	_, err = doUMounts(store, args)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
	}
	return err
}

func doUMounts(store storage.Store, args []string) ([]string, error) {
	umountContainerErrStr := "error unmounting container"
	var ids []string
	if len(args) > 0 {
		for _, name := range args {
			builder, err := openBuilder(getContext(), store, name)
			if err != nil {
				return nil, fmt.Errorf("%s %s: %w", umountContainerErrStr, name, err)
			}
			if builder.MountPoint == "" {
				continue
			}

			if err = builder.Unmount(); err != nil {
				return nil, fmt.Errorf("%s %q: %w", umountContainerErrStr, builder.Container, err)
			}
			ids = append(ids, builder.ContainerID)
		}
	} else {
		builders, err := openBuilders(store)
		if err != nil {
			return nil, fmt.Errorf("reading build Containers: %w", err)
		}
		for _, builder := range builders {
			if builder.MountPoint == "" {
				continue
			}
			if err = builder.Unmount(); err != nil {
				return nil, fmt.Errorf("%s %q: %w", umountContainerErrStr, builder.Container, err)
			}
			ids = append(ids, builder.ContainerID)
		}
	}
	return ids, nil
}
