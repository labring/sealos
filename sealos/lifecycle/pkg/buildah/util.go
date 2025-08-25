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

package buildah

import (
	"github.com/containers/common/libimage"

	"github.com/labring/sealos/pkg/utils/file"
)

func PreloadIfTarFile(images []string, transport string) ([]string, error) {
	r, err := getRuntime(nil)
	if err != nil {
		return nil, err
	}
	var ret []string
	for i := range images {
		if file.IsTarFile(images[i]) {
			ref := FormatReferenceWithTransportName(transport, images[i])
			names, err := r.PullOrLoadImages(getContext(), []string{ref}, libimage.CopyOptions{})
			if err != nil {
				return nil, err
			}
			ret = append(ret, names...)
		} else {
			ret = append(ret, images[i])
		}
	}
	return ret, nil
}
