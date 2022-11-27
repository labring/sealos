package buildah

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/containers/buildah"
	"github.com/containers/common/pkg/umask"
	"github.com/containers/image/v5/image"
	"github.com/containers/image/v5/manifest"
	is "github.com/containers/image/v5/storage"
	"github.com/containers/image/v5/types"
	"github.com/containers/storage"
	"github.com/containers/storage/pkg/unshare"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
)

var (
	// configuration, including customizations made in containers.conf
	needToShutdownStore = false
)

func flagChanged(c *cobra.Command, name string) bool {
	if fs := c.Flag(name); fs != nil && fs.Changed {
		return true
	}
	return false
}

func getStore(c *cobra.Command) (storage.Store, error) {
	if err := setXDGRuntimeDir(); err != nil {
		return nil, err
	}
	options, err := storage.DefaultStoreOptions(unshare.GetRootlessUID() > 0, unshare.GetRootlessUID())
	if err != nil {
		return nil, err
	}
	if flagChanged(c, "root") || flagChanged(c, "runroot") {
		options.GraphRoot = globalFlagResults.Root
		options.RunRoot = globalFlagResults.RunRoot
	}
	if flagChanged(c, "storage-driver") {
		options.GraphDriverName = globalFlagResults.StorageDriver
		// If any options setup in config, these should be dropped if user overrode the driver
		options.GraphDriverOptions = []string{}
	}
	if flagChanged(c, "storage-opt") {
		if len(globalFlagResults.StorageOpts) > 0 {
			options.GraphDriverOptions = globalFlagResults.StorageOpts
		}
	}

	// Do not allow to mount a graphdriver that is not vfs if we are creating the userns as part
	// of the mount command.
	// Differently, allow the mount if we are already in a userns, as the mount point will still
	// be accessible once "buildah mount" exits.
	if os.Geteuid() != 0 && options.GraphDriverName != "vfs" {
		return nil, fmt.Errorf("cannot mount using driver %s in rootless mode. You need to run it in a `buildah unshare` session", options.GraphDriverName)
	}

	if len(globalFlagResults.UserNSUID) > 0 {
		uopts := globalFlagResults.UserNSUID
		gopts := globalFlagResults.UserNSGID

		if len(gopts) == 0 {
			gopts = uopts
		}

		uidmap, gidmap, err := unshare.ParseIDMappings(uopts, gopts)
		if err != nil {
			return nil, err
		}
		options.UIDMap = uidmap
		options.GIDMap = gidmap
	} else {
		if len(globalFlagResults.UserNSGID) > 0 {
			return nil, errors.New("option --userns-gid-map can not be used without --userns-uid-map")
		}
	}

	// If a subcommand has the flags, check if they are set; if so, override the global values
	if flagChanged(c, "userns-uid-map") {
		uopts, _ := c.Flags().GetStringSlice("userns-uid-map")
		gopts, _ := c.Flags().GetStringSlice("userns-gid-map")
		if len(gopts) == 0 {
			gopts = uopts
		}
		uidmap, gidmap, err := unshare.ParseIDMappings(uopts, gopts)
		if err != nil {
			return nil, err
		}
		options.UIDMap = uidmap
		options.GIDMap = gidmap
	} else {
		if flagChanged(c, "userns-gid-map") {
			return nil, errors.New("option --userns-gid-map can not be used without --userns-uid-map")
		}
	}
	umask.Check()

	store, err := storage.GetStore(options)
	if store != nil {
		is.Transport.SetStore(store)
	}
	needToShutdownStore = true
	return store, err
}

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
		if errors.Is(err, os.ErrNotExist) {
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
		return nil, errors.New("finding build container")
	}
	return builder, nil
}

func openBuilders(store storage.Store) (builders []*buildah.Builder, err error) {
	return buildah.OpenAllBuilders(store)
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
		return nil, errors.New("mocking up build configuration")
	}
	return builder, nil
}

func getDateAndDigestAndSize(ctx context.Context, sys *types.SystemContext, store storage.Store, storeImage storage.Image) (time.Time, string, int64, error) {
	created := time.Time{}
	is.Transport.SetStore(store)
	storeRef, err := is.Transport.ParseStoreReference(store, storeImage.ID)
	if err != nil {
		return created, "", -1, err
	}
	img, err := storeRef.NewImageSource(ctx, nil)
	if err != nil {
		return created, "", -1, err
	}
	defer img.Close()
	imgSize, sizeErr := store.ImageSize(storeImage.ID)
	if sizeErr != nil {
		imgSize = -1
	}
	manifestBytes, _, manifestErr := img.GetManifest(ctx, nil)
	manifestDigest := ""
	if manifestErr == nil && len(manifestBytes) > 0 {
		mDigest, err := manifest.Digest(manifestBytes)
		manifestErr = err
		if manifestErr == nil {
			manifestDigest = mDigest.String()
		}
	}
	inspectable, inspectableErr := image.FromUnparsedImage(ctx, sys, image.UnparsedInstance(img, nil))
	if inspectableErr == nil {
		inspectInfo, inspectErr := inspectable.Inspect(ctx)
		if inspectErr == nil && inspectInfo != nil && inspectInfo.Created != nil {
			created = *inspectInfo.Created
		}
	}
	if sizeErr != nil {
		err = sizeErr
	} else if manifestErr != nil {
		err = manifestErr
	}
	return created, manifestDigest, imgSize, err
}

// getContext returns a context.TODO
func getContext() context.Context {
	return context.TODO()
}

func getUserFlags() pflag.FlagSet {
	fs := pflag.FlagSet{}
	fs.String("user", "", "`user[:group]` to run the command as")
	return fs
}

func defaultFormat() string {
	format := os.Getenv("BUILDAH_FORMAT")
	if format != "" {
		return format
	}
	return buildah.OCI
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
