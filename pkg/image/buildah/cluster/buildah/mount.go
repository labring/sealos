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

	"github.com/pkg/errors"
)

type jsonMount struct {
	Container  string `json:"container,omitempty"`
	MountPoint string `json:"mountPoint"`
}

type mountOptions struct {
	json bool
}

func Mount(name string) error {
	globalFlagResults := newGlobalOptions()
	store, err := getStore(globalFlagResults)
	if err != nil {
		return err
	}
	opts := mountOptions{
		json: false,
	}
	var jsonMounts []jsonMount
	var lastError error

	args := []string{name}
	if len(args) > 0 {
		// Do not allow to mount a graphdriver that is not vfs if we are creating the userns as part
		// of the mount command.
		// Differently, allow the mount if we are already in a userns, as the mount point will still
		// be accessible once "buildah mount" exits.
		if os.Geteuid() != 0 && store.GraphDriverName() != "vfs" {
			return errors.Errorf("cannot mount using driver %s in rootless mode. You need to run it in a `buildah unshare` session", store.GraphDriverName())
		}

		for _, name := range args {
			builder, err := openBuilder(getContext(), store, name)
			if err != nil {
				if lastError != nil {
					fmt.Fprintln(os.Stderr, lastError)
				}
				lastError = errors.Wrapf(err, "error reading build container %q", name)
				continue
			}
			mountPoint, err := builder.Mount(builder.MountLabel)
			if err != nil {
				if lastError != nil {
					fmt.Fprintln(os.Stderr, lastError)
				}
				lastError = errors.Wrapf(err, "error mounting %q container %q", name, builder.Container)
				continue
			}
			if len(args) > 1 {
				if opts.json {
					jsonMounts = append(jsonMounts, jsonMount{Container: name, MountPoint: mountPoint})
					continue
				}
				fmt.Printf("%s %s\n", name, mountPoint)
			} else {
				if opts.json {
					jsonMounts = append(jsonMounts, jsonMount{MountPoint: mountPoint})
					continue
				}
				//fmt.Printf("%s\n", mountPoint)
			}
		}
	} else {
		builders, err := openBuilders(store)
		if err != nil {
			return errors.Wrapf(err, "error reading build containers")
		}

		for _, builder := range builders {
			mounted, err := builder.Mounted()
			if err != nil {
				return err
			}
			if mounted {
				if opts.json {
					jsonMounts = append(jsonMounts, jsonMount{Container: builder.Container, MountPoint: builder.MountPoint})
					continue
				}
				fmt.Printf("%s %s\n", builder.Container, builder.MountPoint)
			}
		}
	}

	if opts.json {
		data, err := json.MarshalIndent(jsonMounts, "", "    ")
		if err != nil {
			return err
		}
		fmt.Printf("%s\n", data)
	}

	return lastError
}
