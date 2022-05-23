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
	"os"

	"github.com/containers/buildah/util"
	"github.com/pkg/errors"
)

func RM(containerName string) error {
	delContainerErrStr := "error removing container"

	globalFlagResults := newGlobalOptions()
	store, err := getStore(globalFlagResults)
	if err != nil {
		return err
	}

	var lastError error

	for _, name := range []string{containerName} {
		builder, err := openBuilder(getContext(), store, name)
		if err != nil {
			lastError = util.WriteError(os.Stderr, errors.Wrapf(err, "%s %q", delContainerErrStr, name), lastError)
			continue
		}

		if err = builder.Delete(); err != nil {
			lastError = util.WriteError(os.Stderr, errors.Wrapf(err, "%s %q", delContainerErrStr, name), lastError)
			continue
		}
		//fmt.Printf("%s\n", builder.ContainerID)
	}

	return lastError
}
