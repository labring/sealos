// Copyright © 2022 buildah.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//	https://github.com/containers/buildah/blob/main/LICENSE
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
package buildah

import (
	"fmt"
	"os"

	"github.com/pkg/errors"
)

// Currently, only one Container is supported
func UMount(containerName string) error {
	umountContainerErrStr := "error unmounting container"

	globalFlagResults := newGlobalOptions()
	store, err := getStore(globalFlagResults)
	if err != nil {
		return err
	}

	var lastError error

	for _, name := range []string{containerName} {
		builder, err := openBuilder(getContext(), store, name)
		if err != nil {
			if lastError != nil {
				fmt.Fprintln(os.Stderr, lastError)
			}
			lastError = errors.Wrapf(err, "%s %s", umountContainerErrStr, name)
			continue
		}
		if builder.MountPoint == "" {
			continue
		}

		if err = builder.Unmount(); err != nil {
			if lastError != nil {
				fmt.Fprintln(os.Stderr, lastError)
			}
			lastError = errors.Wrapf(err, "%s %q", umountContainerErrStr, builder.Container)
			continue
		}
		//fmt.Printf("%s\n", builder.ContainerID)
	}

	return lastError
}
