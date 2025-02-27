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
	"github.com/containers/common/libimage"
	"github.com/containers/image/v5/transports"
	"github.com/containers/image/v5/types"
	"github.com/containers/storage"
	storagetypes "github.com/containers/storage/types"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"

	"github.com/labring/sealos/pkg/utils/logger"
)

type Interface interface {
	Pull(imageNames []string, opts ...FlagSetter) error
	Load(input string, ociType string) (string, error)
	InspectImage(name string, opts ...string) (*InspectOutput, error)
	Create(name string, image string, opts ...FlagSetter) (buildah.BuilderInfo, error)
	Delete(name string) error
	InspectContainer(name string) (buildah.BuilderInfo, error)
	ListContainers() ([]JSONContainer, error)
	Runtime() *Runtime
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
	setDefaultSystemContext(systemContext)
	r, err := getRuntimeWithStoreAndSystemContext(store, systemContext)
	if err != nil {
		return nil, err
	}
	return &realImpl{
		id:            id,
		store:         store,
		systemContext: systemContext,
		runtime:       r,
	}, nil
}

type realImpl struct {
	id            string // as identity prefix
	store         storage.Store
	systemContext *types.SystemContext
	runtime       *Runtime
}

func (impl *realImpl) Runtime() *Runtime {
	return impl.runtime
}

type FlagSetter func(*pflag.FlagSet) error

func newFlagSetter(k string, v string) FlagSetter {
	return func(fs *pflag.FlagSet) error {
		if f := fs.Lookup(k); f != nil {
			return fs.Set(k, v)
		}
		return nil
	}
}

func WithPlatformOption(pf v1.Platform) FlagSetter {
	return func(fs *pflag.FlagSet) error {
		for _, fn := range []FlagSetter{
			newFlagSetter("os", pf.OS),
			newFlagSetter("arch", pf.Architecture),
			newFlagSetter("variant", pf.Variant),
		} {
			if err := fn(fs); err != nil {
				return err
			}
		}
		return nil
	}
}

func WithPullPolicyOption(policy string) FlagSetter {
	return func(fs *pflag.FlagSet) error {
		return newFlagSetter("policy", policy)(fs)
	}
}

func (impl *realImpl) Pull(imageNames []string, opts ...FlagSetter) error {
	cmd := impl.mockCmd()
	iopt := newDefaultPullOptions()
	_ = iopt.RegisterFlags(cmd.Flags())
	for i := range opts {
		if err := opts[i](cmd.Flags()); err != nil {
			return err
		}
	}
	if err := setDefaultFlagsWithSetters(cmd, setDefaultTLSVerifyFlag); err != nil {
		return err
	}
	ids, err := doPull(cmd, impl.store, nil, imageNames, iopt)
	if err != nil {
		return err
	}
	logger.Debug("images %s are pulled", strings.Join(ids, ", "))
	return nil
}

func finalizeReference(transport types.ImageTransport, imgName string) (types.ImageTransport, string) {
	parts := strings.SplitN(imgName, ":", 2)
	if len(parts) == 2 {
		if transport := transports.Get(parts[0]); transport != nil {
			return transport, imgName
		}
	}
	return transport, FormatReferenceWithTransportName(transport.Name(), imgName)
}

func (impl *realImpl) InspectImage(name string, opts ...string) (*InspectOutput, error) {
	transportName := TransportContainersStorage
	if len(opts) > 0 {
		transportName = opts[0]
	}
	transport := transports.Get(transportName)
	if transport == nil {
		return nil, fmt.Errorf(`unknown transport "%s"`, opts[0])
	}
	ctx := getContext()
	return openImage(ctx, impl.systemContext, impl.store, transport, name)
}

func (impl *realImpl) Create(name string, image string, opts ...FlagSetter) (buildah.BuilderInfo, error) {
	if err := impl.Delete(impl.finalizeName(name)); err != nil {
		return buildah.BuilderInfo{}, fmt.Errorf("failed to delete: %v", err)
	}
	if _, err := impl.from(impl.finalizeName(name), image, opts...); err != nil {
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

func (impl *realImpl) from(name, image string, opts ...FlagSetter) (*buildah.Builder, error) {
	cmd := impl.mockCmd()
	iopts := newDefaultFromReply()
	iopts.name = impl.finalizeName(name)
	iopts.pull = ""
	iopts.RegisterFlags(cmd.Flags())
	for i := range opts {
		if err := opts[i](cmd.Flags()); err != nil {
			return nil, err
		}
	}
	if err := setDefaultFlagsWithSetters(cmd, setDefaultTLSVerifyFlag); err != nil {
		return nil, err
	}
	return doFrom(cmd, image, iopts, impl.store, nil)
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

func (impl *realImpl) Load(input string, transport string) (string, error) {
	ref := FormatReferenceWithTransportName(transport, input)
	names, err := impl.runtime.PullOrLoadImages(getContext(), []string{ref}, libimage.CopyOptions{})
	if err != nil {
		return "", err
	}
	return names[0], nil
}
