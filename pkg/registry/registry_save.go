// Copyright © 2021 sealos.
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

package registry

import (
	"context"
	"strings"

	"github.com/docker/docker/api/types"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"

	"github.com/labring/sealos/pkg/utils/logger"
)

type TmpRegistryImage struct {
	ctx          context.Context
	maxPullProcs int
	auths        map[string]types.AuthConfig
}

func (is *TmpRegistryImage) SaveImages(images []string, dir string, platform v1.Platform) ([]string, error) {
	logger.Debug("trying to save images: %+v for platform: %s", images,
		strings.Join([]string{platform.OS, platform.Architecture, platform.Variant}, ","))

	return nil, nil
}
