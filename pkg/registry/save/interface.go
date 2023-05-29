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

package save

import (
	"context"

	"github.com/labring/sealos/pkg/system"

	"github.com/google/go-containerregistry/pkg/name"

	"github.com/docker/docker/api/types"

	"github.com/docker/docker/pkg/progress"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
)

// Registry can save a list of images of the specified platform
type Registry interface {
	// SaveImages is not concurrently safe
	SaveImages(images []string, dir string, platform v1.Platform) ([]string, error)
}

type defaultImage struct {
	ctx            context.Context
	domainToImages map[string][]name.Reference
	progressOut    progress.Output
	maxPullProcs   int
	auths          map[string]types.AuthConfig
}

type tmpRegistryImage struct {
	ctx          context.Context
	maxPullProcs int
	auths        map[string]types.AuthConfig
}

func NewImageSaver(ctx context.Context, maxPullProcs int, auths map[string]types.AuthConfig) Registry {
	if v, _ := system.Get(system.RegistrySyncExperimentalConfigKey); v == "true" {
		return newTmpRegistrySaver(ctx, maxPullProcs, auths)
	}

	return newDefaultRegistrySaver(ctx, maxPullProcs, auths)
}

func newDefaultRegistrySaver(ctx context.Context, maxPullProcs int, auths map[string]types.AuthConfig) Registry {
	if ctx == nil {
		ctx = context.Background()
	}
	if auths == nil {
		auths = make(map[string]types.AuthConfig)
	}
	return &defaultImage{
		ctx:            ctx,
		domainToImages: make(map[string][]name.Reference),
		maxPullProcs:   maxPullProcs,
		auths:          auths,
	}
}

func newTmpRegistrySaver(ctx context.Context, maxPullProcs int, auths map[string]types.AuthConfig) Registry {
	if ctx == nil {
		ctx = context.Background()
	}
	if auths == nil {
		auths = make(map[string]types.AuthConfig)
	}
	return &tmpRegistryImage{
		ctx:          ctx,
		maxPullProcs: maxPullProcs,
		auths:        auths,
	}
}
