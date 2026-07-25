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
	"fmt"
	"github.com/containers/image/v5/transports/alltransports"
	"strings"
	stdsync "sync"
	"time"

	"github.com/containers/image/v5/copy"
	itype "github.com/containers/image/v5/types"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/sreg/registry/handler"
	"github.com/labring/sealos/pkg/sreg/registry/sync"
	httputils "github.com/labring/sealos/pkg/sreg/utils/http"
	"github.com/labring/sealos/pkg/sreg/utils/logger"
)

func NewImageTarSaver(ctx context.Context, maxPullProcs int, all bool) Registry {
	if ctx == nil {
		ctx = context.Background()
	}
	imageListSelection := copy.CopySystemImage
	if all {
		imageListSelection = copy.CopyAllImages
	}
	return &tmpTarRegistryImage{
		ctx:                ctx,
		maxPullProcs:       maxPullProcs,
		imageListSelection: imageListSelection,
	}
}

type tmpTarRegistryImage struct {
	ctx                context.Context
	maxPullProcs       int
	imageListSelection copy.ImageListSelection
}

func (is *tmpTarRegistryImage) SaveImages(images []string, dir string, platform v1.Platform) ([]string, error) {
	logger.Debug("trying to save images: %+v for platform: %s", images,
		strings.Join([]string{platform.OS, platform.Architecture, platform.Variant}, ","))
	config, err := handler.NewConfig(dir, 0)
	if err != nil {
		return nil, err
	}
	config.Log.AccessLog.Disabled = true
	errCh := handler.Run(is.ctx, config)

	probeCtx, cancel := context.WithTimeout(is.ctx, time.Second*3)
	defer cancel()
	ep := sync.ParseRegistryAddress(localhost, config.HTTP.Addr)
	if err = httputils.WaitUntilEndpointAlive(probeCtx, "http://"+ep); err != nil {
		return nil, err
	}

	if platform.OS == "" {
		platform.OS = "linux"
	}
	sys := &itype.SystemContext{
		ArchitectureChoice:          platform.Architecture,
		OSChoice:                    platform.OS,
		VariantChoice:               platform.Variant,
		DockerInsecureSkipTLSVerify: itype.OptionalBoolTrue,
	}
	eg, _ := errgroup.WithContext(is.ctx)
	numCh := make(chan struct{}, is.maxPullProcs)
	var outImages []string
	var mu stdsync.Mutex
	for index := range images {
		img := images[index]
		numCh <- struct{}{}
		eg.Go(func() error {
			mu.Lock()
			defer func() {
				<-numCh
				mu.Unlock()
			}()
			if strings.TrimSpace(img) == "" {
				return nil
			}
			allImage := strings.Split(img, "@")
			srcRef, err := alltransports.ParseImageName(allImage[0])
			if err != nil {
				return fmt.Errorf("invalid source name %s: %v", allImage[0], err)
			}
			err = sync.ArchiveToImage(is.ctx, sys, srcRef, fmt.Sprintf("%s/%s", ep, allImage[1]), is.imageListSelection)
			if err != nil {
				return fmt.Errorf("save image %s: %w", img, err)
			}
			outImages = append(outImages, img)
			return nil
		})
	}
	err = eg.Wait()
	errCh <- err
	return outImages, err
}
