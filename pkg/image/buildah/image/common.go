// Copyright © 2022 buildah.
//
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

package image

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/containers/buildah/pkg/formats"
	"github.com/containers/common/libimage"
	"github.com/docker/go-units"

	"github.com/containers/buildah"
	"github.com/containers/buildah/define"
	"github.com/containers/image/v5/types"
	encconfig "github.com/containers/ocicrypt/config"
	enchelpers "github.com/containers/ocicrypt/helpers"
	labring_types "github.com/labring/sealos/pkg/image/types"

	"github.com/containers/storage"
	"github.com/containers/storage/pkg/unshare"
	"github.com/pkg/errors"
)

const (
	maxPullPushRetries = 3
	pullPushRetryDelay = 2 * time.Second
)

// setXDGRuntimeDir sets XDG_RUNTIME_DIR when if it is unset under rootless
func setXDGRuntimeDir() error {
	if unshare.IsRootless() && os.Getenv("XDG_RUNTIME_DIR") == "" {
		runtimeDir, err := storage.GetRootlessRuntimeDir(unshare.GetRootlessUID())
		if err != nil {
			return err
		}
		if err := os.Setenv("XDG_RUNTIME_DIR", runtimeDir); err != nil {
			return errors.New("could not set XDG_RUNTIME_DIR")
		}
	}
	return nil
}

func openBuilder(ctx context.Context, store storage.Store, name string) (builder *buildah.Builder, err error) {
	if name != "" {
		builder, err = buildah.OpenBuilder(store, name)
		if os.IsNotExist(errors.Cause(err)) {
			options := buildah.ImportOptions{
				Container: name,
			}
			builder, err = buildah.ImportBuilder(ctx, store, options)
		}
	}
	if err != nil {
		return nil, err
	}
	if builder == nil {
		return nil, errors.Errorf("error finding build container")
	}
	return builder, nil
}

func openImage(ctx context.Context, sc *types.SystemContext, store storage.Store, name string) (builder *buildah.Builder, err error) {
	options := buildah.ImportFromImageOptions{
		Image:         name,
		SystemContext: sc,
	}
	builder, err = buildah.ImportBuilderFromImage(ctx, store, options)
	if err != nil {
		return nil, err
	}
	if builder == nil {
		return nil, errors.Errorf("error mocking up build configuration")
	}
	return builder, nil
}

// getContext returns a context.TODO
func getContext() context.Context {
	return context.TODO()
}

func getFormat(format string) (string, error) {
	switch format {
	case define.OCI:
		return define.OCIv1ImageManifest, nil
	case define.DOCKER:
		return define.Dockerv2ImageManifest, nil
	default:
		return "", errors.Errorf("unrecognized image type %q", format)
	}
}

func getDecryptConfig(decryptionKeys []string) (*encconfig.DecryptConfig, error) {
	decConfig := &encconfig.DecryptConfig{}
	if len(decryptionKeys) > 0 {
		// decryption
		dcc, err := enchelpers.CreateCryptoConfig([]string{}, decryptionKeys)
		if err != nil {
			return nil, errors.Wrapf(err, "invalid decryption keys")
		}
		cc := encconfig.CombineCryptoConfigs([]encconfig.CryptoConfig{dcc})
		decConfig = cc.DecryptConfig
	}

	return decConfig, nil
}

func getEncryptConfig(encryptionKeys []string, encryptLayers []int) (*encconfig.EncryptConfig, *[]int, error) {
	var encLayers *[]int
	var encConfig *encconfig.EncryptConfig

	if len(encryptionKeys) > 0 {
		// encryption
		encLayers = &encryptLayers
		ecc, err := enchelpers.CreateCryptoConfig(encryptionKeys, []string{})
		if err != nil {
			return nil, nil, errors.Wrapf(err, "invalid encryption keys")
		}
		cc := encconfig.CombineCryptoConfigs([]encconfig.CryptoConfig{ecc})
		encConfig = cc.EncryptConfig
	}
	return encConfig, encLayers, nil
}

// Tail returns a string slice after the first element unless there are
// not enough elements, then it returns an empty slice.  This is to replace
// the urfavecli Tail method for args
func Tail(a []string) []string {
	if len(a) >= 2 {
		return a[1:]
	}
	return []string{}
}

// UsageTemplate returns the usage template for podman commands
// This blocks the displaying of the global options. The main podman
// command should not use this.
func UsageTemplate() string {
	return `Usage:{{if .Runnable}}
  {{.UseLine}}{{end}}{{if .HasAvailableSubCommands}}
  {{.CommandPath}} [command]{{end}}{{if gt (len .Aliases) 0}}

Aliases:
  {{.NameAndAliases}}{{end}}{{if .HasExample}}

Examples:
  {{.Example}}{{end}}{{if .HasAvailableSubCommands}}

Available Commands:{{range .Commands}}{{if (or .IsAvailableCommand (eq .Name "help"))}}
  {{rpad .Name .NamePadding }} {{.Short}}{{end}}{{end}}{{end}}{{if .HasAvailableLocalFlags}}

Flags:
{{.LocalFlags.FlagUsages | trimTrailingWhitespaces}}{{end}}{{if .HasAvailableInheritedFlags}}
{{end}}
`
}

func imagesToGeneric(templParams []labring_types.ImageOutputParams) (genericParams []interface{}) {
	if len(templParams) > 0 {
		for _, v := range templParams {
			genericParams = append(genericParams, interface{}(v))
		}
	}
	return genericParams
}

func outputHeader(opts labring_types.ImageOptions) string {
	if opts.Format != "" {
		return strings.Replace(opts.Format, `\t`, "\t", -1)
	}
	if opts.Quiet {
		return formats.IDString
	}
	format := "table {{.Name}}\t{{.Tag}}\t"
	if opts.NoHeading {
		format = "{{.Name}}\t{{.Tag}}\t"
	}

	if opts.Digests {
		format += "{{.Digest}}\t"
	}
	format += "{{.ID}}\t{{.CreatedAt}}\t{{.Size}}"
	if opts.ReadOnly {
		format += "\t{{.ReadOnly}}"
	}
	if opts.History {
		format += "\t{{.History}}"
	}
	return format
}

func formatHistory(history []string, name, tag string) string {
	if len(history) == 0 {
		return none
	}
	// Skip the first history entry if already existing as name
	if fmt.Sprintf("%s:%s", name, tag) == history[0] {
		if len(history) == 1 {
			return none
		}
		return strings.Join(history[1:], ", ")
	}
	return strings.Join(history, ", ")
}

func formatImagesJSON(images []*libimage.Image, opts labring_types.ImageOptions) error {
	jsonImages := []labring_types.JSONImage{}
	for _, img := range images {
		// Copy the base data over to the output param.
		size, err := img.Size()
		if err != nil {
			return err
		}
		created := img.Created()
		jsonImages = append(jsonImages,
			labring_types.JSONImage{
				CreatedAtRaw: created,
				Created:      created.Unix(),
				CreatedAt:    units.HumanDuration(time.Since(created)) + " ago",
				Digest:       img.Digest().String(),
				ID:           truncateID(img.ID(), opts.Truncate),
				Names:        img.Names(),
				ReadOnly:     img.IsReadOnly(),
				Size:         formattedSize(size),
			})
	}

	data, err := json.MarshalIndent(jsonImages, "", "    ")
	if err != nil {
		return err
	}
	fmt.Printf("%s\n", data)
	return nil
}

const idTruncLength = 12

func truncateID(id string, truncate bool) string {
	if !truncate {
		return "sha256:" + id
	}
	if len(id) > idTruncLength {
		return id[:idTruncLength]
	}
	return id
}

func formattedSize(size int64) string {
	suffixes := [5]string{"B", "KB", "MB", "GB", "TB"}

	count := 0
	formattedSize := float64(size)
	for formattedSize >= 1000 && count < 4 {
		formattedSize /= 1000
		count++
	}
	return fmt.Sprintf("%.3g %s", formattedSize, suffixes[count])
}
