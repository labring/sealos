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
	"encoding/json"
	"fmt"
	"os"

	buildahcli "github.com/containers/buildah/pkg/cli"
	"github.com/containers/storage"
	"github.com/spf13/cobra"
)

type jsonMount struct {
	Container  string `json:"container,omitempty"`
	MountPoint string `json:"mountPoint"`
}

type mountOptions struct {
	json bool
}

func newMountCommand() *cobra.Command {
	var (
		mountDescription = fmt.Sprintf(`%[1]s mount
  mounts a working container's root filesystem for manipulation.
`, rootCmd.CommandPath())
		opts       mountOptions
		noTruncate bool
	)
	mountCommand := &cobra.Command{
		Use:    "mount",
		Hidden: true,
		Short:  "Mount a working container's root filesystem",
		Long:   mountDescription,
		RunE: func(cmd *cobra.Command, args []string) error {
			return mountCmd(cmd, args, opts)
		},
		Example: fmt.Sprintf(`%[1]s mount
  %[1]s mount containerID
  %[1]s mount containerID1 containerID2
`, rootCmd.CommandPath()),
	}
	mountCommand.SetUsageTemplate(UsageTemplate())

	fs := mountCommand.Flags()
	fs.SetInterspersed(false)
	fs.BoolVar(&opts.json, "json", false, "output in JSON format")
	fs.BoolVar(&noTruncate, "notruncate", false, "do not truncate output")
	err := markFlagsHidden(fs, "notruncate")
	bailOnError(err, "")
	return mountCommand
}

func mountCmd(c *cobra.Command, args []string, opts mountOptions) error {
	if err := buildahcli.VerifyFlagsArgsOrder(args); err != nil {
		return err
	}

	store, err := getStore(c)
	if err != nil {
		return err
	}
	jsonMounts, err := doMounts(store, args)
	if err != nil {
		return err
	}
	if opts.json {
		data, err := json.MarshalIndent(jsonMounts, "", "    ")
		if err != nil {
			return err
		}
		fmt.Printf("%s\n", data)
	} else {
		for i := range jsonMounts {
			fmt.Printf("%s %s\n", jsonMounts[i].Container, jsonMounts[i].MountPoint)
		}
	}
	return nil
}

func doMounts(store storage.Store, args []string) ([]jsonMount, error) {
	var jsonMounts []jsonMount
	if len(args) > 0 {
		// Do not allow to mount a graphdriver that is not vfs if we are creating the userns as part
		// of the mount command.
		// Differently, allow the mount if we are already in a userns, as the mount point will still
		// be accessible once "buildah mount" exits.
		if os.Geteuid() != 0 && store.GraphDriverName() != "vfs" {
			return nil, fmt.Errorf("cannot mount using driver %s in rootless mode. You need to run it in a `buildah unshare` session", store.GraphDriverName())
		}

		for _, name := range args {
			builder, err := openBuilder(getContext(), store, name)
			if err != nil {
				return nil, fmt.Errorf("reading build container %q: %w", name, err)
			}
			mountPoint, err := builder.Mount(builder.MountLabel)
			if err != nil {
				return nil, fmt.Errorf("mounting %q container %q: %w", name, builder.Container, err)
			}
			jsonMounts = append(jsonMounts, jsonMount{Container: name, MountPoint: mountPoint})
		}
	} else {
		builders, err := openBuilders(store)
		if err != nil {
			return nil, fmt.Errorf("reading build containers: %w", err)
		}

		for _, builder := range builders {
			mounted, err := builder.Mounted()
			if err != nil {
				return nil, err
			}
			if mounted {
				jsonMounts = append(jsonMounts, jsonMount{Container: builder.Container, MountPoint: builder.MountPoint})
			}
		}
	}
	return jsonMounts, nil
}
