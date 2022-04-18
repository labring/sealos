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

	"github.com/docker/docker/api/types"

	"github.com/docker/docker/pkg/progress"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
)

//SaveImage can save a list of images of the specified platform
type Save interface {
	// SaveImages is not concurrently safe
	SaveImages(images []string, dir string, platform v1.Platform) ([]string, error)
}

type DefaultImageSaver struct {
	ctx            context.Context
	domainToImages map[string][]Named
	progressOut    progress.Output
	auths          map[string]types.AuthConfig
}

func NewImageSaver(ctx context.Context, auths map[string]types.AuthConfig) Save {
	if ctx == nil {
		ctx = context.Background()
	}
	if auths == nil {
		auths = make(map[string]types.AuthConfig)
	}
	return &DefaultImageSaver{
		ctx:            ctx,
		domainToImages: make(map[string][]Named),
		auths:          auths,
	}
}
