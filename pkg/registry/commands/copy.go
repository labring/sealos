/*
Copyright 2023 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package commands

import (
	"context"
	"fmt"
	"time"

	imagecopy "github.com/containers/image/v5/copy"
	"github.com/containers/image/v5/types"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/registry/crane"
	"github.com/labring/sealos/pkg/registry/sync"
	httputils "github.com/labring/sealos/pkg/utils/http"
)

type globalOptions struct {
	overrideArch    string // Architecture to use for choosing images, instead of the runtime one
	overrideOS      string // OS to use for choosing images, instead of the runtime one
	overrideVariant string // Architecture variant to use for choosing images, instead of the runtime one
	all             bool   // Sync all images if SOURCE-IMAGE is a list
}

func (opts *globalOptions) RegisterFlags(fs *pflag.FlagSet) {
	fs.StringVar(&opts.overrideArch, "override-arch", "", "use `ARCH` instead of the architecture of the machine for choosing images")
	fs.StringVar(&opts.overrideOS, "override-os", "", "use `OS` instead of the running OS for choosing images")
	fs.StringVar(&opts.overrideVariant, "override-variant", "", "use `VARIANT` instead of the running architecture variant for choosing images")
	fs.BoolVarP(&opts.all, "all", "a", false, "Sync all images if SOURCE-IMAGE is a list")
}

func (opts *globalOptions) newSystemContext() *types.SystemContext {
	ctx := &types.SystemContext{
		ArchitectureChoice:          opts.overrideArch,
		OSChoice:                    opts.overrideOS,
		VariantChoice:               opts.overrideVariant,
		DockerInsecureSkipTLSVerify: types.OptionalBoolTrue,
	}
	return ctx
}

func NewCopyRegistryCommand(examplePrefix string) *cobra.Command {
	opts := globalOptions{}
	cmd := &cobra.Command{
		Use:   "copy SOURCE_IMAGE DST_REGISTRY",
		Short: "copy single one image to registry",
		Args:  cobra.ExactArgs(2),
		Example: fmt.Sprintf(`%[1]s registry copy docker.io/labring/kubernetes:v1.25.0 sealos.hub:5000
%[1]s registry copy -a docker.io/labring/kubernetes:v1.25.0 sealos.hub:5000`, examplePrefix),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runCopy(cmd, args[0], args[1], opts)
		},
	}
	fs := cmd.Flags()
	fs.SetInterspersed(false)
	opts.RegisterFlags(fs)
	return cmd
}

func runCopy(cmd *cobra.Command, source, dst string, opts globalOptions) error {
	ctx := cmd.Context()
	out := cmd.OutOrStdout()
	imageListSelection := imagecopy.CopySystemImage
	if opts.all {
		imageListSelection = imagecopy.CopyAllImages
	}

	auths, err := crane.GetAuthInfo(nil)
	if err != nil {
		return err
	}

	sys := opts.newSystemContext()
	dep := sync.ParseRegistryAddress(dst)

	eg, _ := errgroup.WithContext(ctx)
	probeCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	eg.Go(func() error {
		return httputils.WaitUntilEndpointAlive(probeCtx, dep)
	})
	if err := eg.Wait(); err != nil {
		return err
	}

	srcRef, err := sync.ImageNameToReference(sys, source, auths)
	if err != nil {
		return err
	}
	if err := sync.ToImage(ctx, sys, srcRef, dep, imageListSelection); err != nil {
		return err
	}
	fmt.Fprintln(out, "Copy image completed")
	return nil
}
