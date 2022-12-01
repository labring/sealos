// Copyright © 2022 sealos.
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
	"fmt"
	"strings"

	"github.com/containers/buildah"
	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/image/v5/types"
	"github.com/containers/storage"
	storagetypes "github.com/containers/storage/types"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/utils/logger"
)

type Interface interface {
	Pull(v1.Platform, string, ...string) error
	Load(string) (string, error)
	InspectImage(string) (v1.Image, error)
	Create(string, string) (buildah.BuilderInfo, error)
	Delete(string) error
	InspectContainer(string) (buildah.BuilderInfo, error)
	ListContainers() ([]JSONContainer, error)
}

func New(id string) (Interface, error) {
	systemContext, err := parse.SystemContextFromOptions(rootCmd)
	if err != nil {
		return nil, fmt.Errorf("building system context: %w", err)
	}
	store, err := getStore(rootCmd)
	if err != nil {
		return nil, err
	}
	return &realImpl{
		id:            id,
		store:         store,
		systemContext: systemContext,
	}, nil
}

type realImpl struct {
	id            string // as identity prefix
	store         storage.Store
	systemContext *types.SystemContext
}

func (impl *realImpl) Pull(pf v1.Platform, pullPolicy string, imageNames ...string) error {
	iopt := newDefaultPullOptions()
	iopt.os = pf.OS
	iopt.arch = pf.Architecture
	iopt.variant = pf.Variant
	iopt.pullPolicy = pullPolicy
	ids, err := doPull(impl.store, impl.systemContext, imageNames, iopt)
	if err != nil {
		return err
	}
	logger.Info("images %s are pulled", strings.Join(ids, ", "))
	return nil
}

func (impl *realImpl) InspectImage(name string) (v1.Image, error) {
	builder, err := openImage(getContext(), impl.systemContext, impl.store, name)
	if err != nil {
		return v1.Image{}, err
	}
	out := buildah.GetBuildInfo(builder)
	return out.OCIv1, nil
}

func (impl *realImpl) Create(name string, image string) (buildah.BuilderInfo, error) {
	if err := impl.Delete(impl.finalizeName(name)); err != nil {
		return buildah.BuilderInfo{}, fmt.Errorf("failed to delete: %v", err)
	}
	if _, err := impl.from(impl.finalizeName(name), image); err != nil {
		return buildah.BuilderInfo{}, fmt.Errorf("failed to from: %v", err)
	}
	if _, err := impl.mount(impl.finalizeName(name)); err != nil {
		return buildah.BuilderInfo{}, fmt.Errorf("failed to mount: %v", err)
	}
	return impl.InspectContainer(name)
}

func (impl *realImpl) Delete(name string) error {
	builder, err := openBuilder(getContext(), impl.store, impl.finalizeName(name))
	if err != nil {
		if err == storagetypes.ErrContainerUnknown {
			return nil
		}
		return err
	}
	return builder.Delete()
}

func (impl *realImpl) from(name, image string) (*buildah.Builder, error) {
	cmd := impl.mockCmd()
	opts := newDefaultFromReply()
	opts.name = impl.finalizeName(name)
	opts.pull = ""
	opts.RegisterFlags(cmd.Flags())
	return doFrom(cmd, image, opts, impl.store, impl.systemContext)
}

func (impl *realImpl) mount(name string) (jsonMount, error) {
	jsonMounts, err := doMounts(impl.store, []string{name})
	if err != nil {
		return jsonMount{}, err
	}
	return jsonMounts[0], nil
}

func (impl *realImpl) mockCmd() *cobra.Command {
	return &cobra.Command{
		Use: "mock",
	}
}

func (impl *realImpl) InspectContainer(name string) (buildah.BuilderInfo, error) {
	builder, err := openBuilder(getContext(), impl.store, impl.finalizeName(name))
	if err != nil {
		return buildah.BuilderInfo{}, err
	}
	return buildah.GetBuildInfo(builder), nil
}

func (impl *realImpl) finalizeName(name string) string {
	if strings.HasPrefix(name, impl.id) {
		return name
	}
	return fmt.Sprintf("%s-%s", impl.id, name)
}

func (impl *realImpl) ListContainers() ([]JSONContainer, error) {
	opts := containerOptions{
		json:      true,
		noHeading: true,
	}
	params, err := parseCtrFilter(fmt.Sprintf("name=%s", impl.id))
	if err != nil {
		return nil, fmt.Errorf("parsing filter: %w", err)
	}
	_, jsonContainers, err := readContainers(impl.store, opts, params)
	return jsonContainers, err
}

func (impl *realImpl) Load(input string) (string, error) {
	ids, err := doPull(impl.store, impl.systemContext, []string{fmt.Sprintf("%s:%s", DockerArchive, input)}, newDefaultPullOptions())
	if err != nil {
		return "", err
	}
	fmt.Printf("%s\n", ids[0])
	return ids[0], nil
}
