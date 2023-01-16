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

// nosemgrep: go.lang.security.audit.xss.import-text-template.import-text-template
import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"regexp"
	"strings"
	"text/template"

	"github.com/containers/buildah"
	buildahcli "github.com/containers/buildah/pkg/cli"
	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/image/v5/image"
	imagestorage "github.com/containers/image/v5/storage"
	"github.com/containers/image/v5/types"
	"github.com/containers/storage"
	ociv1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
	"golang.org/x/term"

	"github.com/labring/sealos/pkg/utils/logger"
)

const (
	inspectTypeApp       = "app"
	inspectTypeContainer = "container"
	inspectTypeImage     = "image"
	inspectTypeManifest  = "manifest"
)

type inspectResults struct {
	format      string
	inspectType string
}

func newDefaultInspectResults() *inspectResults {
	return &inspectResults{
		inspectType: inspectTypeApp,
	}
}

func (opts *inspectResults) RegisterFlags(fs *pflag.FlagSet) {
	fs.SetInterspersed(false)
	fs.StringVarP(&opts.format, "format", "f", "", "use `format` as a Go template to format the output")
	fs.StringVarP(&opts.inspectType, "type", "t", inspectTypeContainer, "look at the item of the specified `type` (container or image) and name")
}

func newInspectCommand() *cobra.Command {
	var (
		opts               = newDefaultInspectResults()
		inspectDescription = "\n  Inspects a build container's or built image's configuration."
	)

	inspectCommand := &cobra.Command{
		Use:   "inspect",
		Short: "Inspect the configuration of a container or image",
		Long:  inspectDescription,
		RunE: func(cmd *cobra.Command, args []string) error {
			return inspectCmd(cmd, args, opts)
		},
		Example: fmt.Sprintf(`%[1]s inspect containerID
  %[1]s inspect --type image imageWithTag
  %[1]s inspect --type image @imageID # or just imageID, '@' is optional
  %[1]s inspect --type image docker://alpine:latest
  %[1]s inspect --type image oci-archive:/abs/path/of/oci/tarfile.tar
  %[1]s inspect --type image docker-archive:/abs/path/of/docker/tarfile.tar
  %[1]s inspect --format '{{.OCIv1.Config.Env}}' alpine`, rootCmd.CommandPath()),
	}
	inspectCommand.SetUsageTemplate(UsageTemplate())
	opts.RegisterFlags(inspectCommand.Flags())
	return inspectCommand
}

func inspectCmd(c *cobra.Command, args []string, iopts *inspectResults) error {
	var (
		builder   *buildah.Builder
		ociConfig *ociv1.Image
	)

	if len(args) == 0 {
		return errors.New("container or image name must be specified")
	}
	if err := buildahcli.VerifyFlagsArgsOrder(args); err != nil {
		return err
	}
	if len(args) > 1 {
		return errors.New("too many arguments specified")
	}

	systemContext, err := parse.SystemContextFromOptions(c)
	if err != nil {
		return fmt.Errorf("building system context: %w", err)
	}
	setDefaultSystemContext(systemContext)

	name := args[0]

	store, err := getStore(c)
	if err != nil {
		return err
	}

	ctx := getContext()

	switch iopts.inspectType {
	case inspectTypeContainer, inspectTypeApp:
		builder, err = openBuilder(ctx, store, name)
		if err != nil {
			if flagChanged(c, "type") {
				return fmt.Errorf("reading build container: %w", err)
			}
			ociConfig, err = openImage(ctx, systemContext, store, name)
			if err != nil {
				if manifestErr := manifestInspect(ctx, store, systemContext, name); manifestErr == nil {
					return nil
				}
				return err
			}
		}
	case inspectTypeImage:
		ociConfig, err = openImage(ctx, systemContext, store, name)
		if err != nil {
			return err
		}
	case inspectTypeManifest:
		return manifestInspect(ctx, store, systemContext, name)
	default:
		return fmt.Errorf("available type options are %s", strings.Join(
			[]string{inspectTypeContainer, inspectTypeApp, inspectTypeImage, inspectTypeManifest}, ", "))
	}
	var out interface{}
	if builder != nil {
		out = buildah.GetBuildInfo(builder)
	} else if ociConfig != nil {
		out = ociConfig
	}
	if iopts.format != "" {
		format := iopts.format
		if matched, err := regexp.MatchString("{{.*}}", format); err != nil {
			return fmt.Errorf("validating format provided: %s: %w", format, err)
		} else if !matched {
			return fmt.Errorf("invalid format provided: %s", format)
		}
		t, err := template.New("format").Parse(format)
		if err != nil {
			return fmt.Errorf("template parsing error: %w", err)
		}
		if err = t.Execute(os.Stdout, out); err != nil {
			return err
		}
		if term.IsTerminal(int(os.Stdout.Fd())) {
			fmt.Println()
		}
		return nil
	}

	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "    ")
	if term.IsTerminal(int(os.Stdout.Fd())) {
		enc.SetEscapeHTML(false)
	}
	return enc.Encode(out)
}

func openImage(ctx context.Context, sc *types.SystemContext, store storage.Store, imgRef string) (*ociv1.Image, error) {
	img, closer, err := inspectImage(ctx, sc, store, imagestorage.Transport, imgRef)
	if err != nil {
		return nil, err
	}
	if closer != nil {
		defer func() {
			if err = closer(); err != nil {
				logger.Error("unexpected error while closing image: %v", err)
			}
		}()
	}
	return img.OCIConfig(ctx)
}

func inspectImage(ctx context.Context, sc *types.SystemContext, store storage.Store, transport types.ImageTransport, imgRef string) (types.Image, func() error, error) {
	transport, imgRef = finalizeReference(transport, imgRef)
	parts := strings.SplitN(imgRef, ":", 2)
	// should never happened
	if len(parts) != 2 {
		return nil, nil, fmt.Errorf(`invalid image name "%s", expected colon-separated transport:reference`, imgRef)
	}
	imgName := parts[1]
	if st, ok := transport.(imagestorage.StoreTransport); ok {
		st.SetStore(store)
	}
	ref, err := transport.ParseReference(imgName)
	if err != nil {
		return nil, nil, err
	}
	src, err := ref.NewImageSource(ctx, sc)
	if err != nil {
		return nil, nil, err
	}
	img, err := image.FromUnparsedImage(ctx, sc, image.UnparsedInstance(src, nil))
	if err != nil {
		return nil, nil, err
	}
	return img, src.Close, nil
}
