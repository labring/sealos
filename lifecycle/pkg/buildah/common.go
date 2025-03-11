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

import (
	"context"
	"errors"
	"fmt"
	"os"
	"runtime"

	"github.com/containers/buildah"
	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/common/pkg/umask"
	is "github.com/containers/image/v5/storage"
	"github.com/containers/image/v5/types"
	"github.com/containers/storage"
	"github.com/containers/storage/pkg/unshare"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"

	"github.com/labring/sealos/pkg/system"
	wrapunshare "github.com/labring/sealos/pkg/unshare"
	"github.com/labring/sealos/pkg/utils/logger"
)

var (
	// configuration, including customizations made in containers.conf
	needToShutdownStore = false
)

var (
	IsRootless = wrapunshare.IsRootless
)

func flagChanged(c *cobra.Command, name string) bool {
	if fs := c.Flag(name); fs != nil && fs.Changed {
		return true
	}
	return false
}

func setDefaultFlagsWithSetters(c *cobra.Command, setters ...func(*cobra.Command) error) error {
	for i := range setters {
		if err := setters[i](c); err != nil {
			return err
		}
	}
	return nil
}

func getPlatformFlags() *pflag.FlagSet {
	fs := &pflag.FlagSet{}
	fs.String("arch", runtime.GOARCH, "set the ARCH of the image to the provided value instead of the architecture of the host")
	fs.String("os", runtime.GOOS, "set the OS to the provided value instead of the current operating system of the host")
	fs.StringSlice("platform", []string{parse.DefaultPlatform()}, "set the OS/ARCH/VARIANT of the image to the provided value instead of the current operating system and architecture of the host (for example `linux/arm`)")
	fs.String("variant", "", "override the `variant` of the specified image")
	return fs
}

func flagsAssociatedWithPlatform() []string {
	return []string{
		"arch", "os", "os-feature", "os-version", "variant",
	}
}

func flagsInBuildCommandToBeHidden() []string {
	return []string{
		"add-host",
		"cap-add",
		"cap-drop",
		"cgroup-parent",
		"cgroupns",
		"cpp-flag",
		"cpu-period",
		"cpu-quota",
		"cpu-shares",
		"cpuset-cpus",
		"cpuset-mems",
		"decryption-key",
		"device",
		"disable-content-trust",
		"hooks-dir",
		"identity-label",
		"iidfile",
		"ipc",
		"logfile",
		"logsplit",
		"memory",
		"memory-swap",
		"network",
		"no-hosts",
		"pid",
		"runtime",
		"runtime-flag",
		"secret",
		"security-opt",
		"ssh",
		"stdin",
		"ulimit",
		"unsetenv",
		"userns",
		"userns-gid-map",
		"userns-gid-map-group",
		"userns-uid-map",
		"userns-uid-map-user",
		"uts",
		"volume",
	}
}

func setDefaultTLSVerifyFlag(c *cobra.Command) error {
	return setDefaultFlagIfNotChanged(c, "tls-verify", "false")
}

func setDefaultSaveImageFlag(c *cobra.Command) error {
	return setDefaultFlagIfNotChanged(c, "save-image", "false")
}

func getPlatformFromFlags(c *cobra.Command) []string {
	platforms, err := c.Flags().GetStringSlice("platform")
	if err != nil {
		logger.Error("failed to get platform from flags: %v", err)
		return []string{}
	}
	return platforms
}

func getTagsFromFlags(c *cobra.Command) []string {
	tag, err := c.Flags().GetStringArray("tag")
	if err != nil {
		return []string{}
	}
	return tag
}

func setDefaultFlagIfNotChanged(c *cobra.Command, k, v string) error {
	if fs := c.Flag(k); fs != nil && !fs.Changed {
		if err := c.Flags().Set(k, v); err != nil {
			return fmt.Errorf("failed to set --%s default to %s: %v", k, v, err)
		}
	}
	return nil
}

// setDefaultSystemContext use only when tls-verify flag not present.
func setDefaultSystemContext(sc *types.SystemContext) {
	sc.DockerInsecureSkipTLSVerify = types.NewOptionalBool(true)
	sc.OCIInsecureSkipTLSVerify = true
	sc.DockerDaemonInsecureSkipTLSVerify = true
}

func bailOnError(err error, format string, a ...interface{}) { // nolint: golint,goprintffuncname
	if err != nil {
		if format != "" {
			logger.Error("%s: %v", fmt.Sprintf(format, a...), err)
		} else {
			logger.Error("%v", err)
		}
		os.Exit(1)
	}
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
		return nil, fmt.Errorf("cannot mount using driver %s in rootless mode. You need to run it in a `%s unshare` session", options.GraphDriverName, c.Root().Name())
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
	// Do we really need to shutdown store before exit?
	// needToShutdownStore = true
	return store, err
}

// setXDGRuntimeDir sets XDG_RUNTIME_DIR when if it is unset under rootless
func setXDGRuntimeDir() error {
	if IsRootless() && os.Getenv("XDG_RUNTIME_DIR") == "" {
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

// getContext returns a context.TODO
func getContext() context.Context {
	return context.TODO()
}

func defaultFormat() string {
	format, _ := system.Get(system.BuildahFormatConfigKey)
	return format
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
