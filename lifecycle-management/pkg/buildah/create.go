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
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/labring/sealos/pkg/guest"

	"github.com/containers/buildah"

	"github.com/labring/sealos/fork/golang/expansion"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"

	stringsutil "github.com/labring/sealos/pkg/utils/strings"

	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/storage/pkg/unshare"
	"github.com/labring/sreg/pkg/utils/file"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/maps"
)

type createOptions struct {
	name     string
	platform string
	short    bool
	env      []string
}

func newDefaultCreateOptions() *createOptions {
	return &createOptions{
		name:     "default",
		platform: parse.DefaultPlatform(),
	}
}

func (opts *createOptions) RegisterFlags(fs *pflag.FlagSet) {
	fs.StringVarP(&opts.name, "cluster", "c", opts.name, "name of cluster to be created but not actually run")
	fs.StringVar(&opts.platform, "platform", opts.platform, "set the OS/ARCH/VARIANT of the image to the provided value instead of the current operating system and architecture of the host (for example `linux/arm`)")
	fs.BoolVar(&opts.short, "short", false, "if true, print just the mount path.")
	fs.StringSliceVarP(&opts.env, "env", "e", opts.env, "set environment variables for template files")
}

func newCreateCmd() *cobra.Command {
	opts := newDefaultCreateOptions()
	var createCmd = &cobra.Command{
		Use:   "create",
		Short: "Create a cluster without running the CMD, for inspecting image",
		Args:  cobra.MinimumNArgs(1),
		RunE: func(c *cobra.Command, args []string) error {
			bder, err := New("")
			if err != nil {
				return err
			}
			flagSetters := []FlagSetter{}
			if flagChanged(c, "platform") {
				oss, arch, variant, err := parse.Platform(opts.platform)
				if err != nil {
					return err
				}
				flagSetters = append(flagSetters, WithPlatformOption(v1.Platform{OS: oss, Architecture: arch, Variant: variant}))
			}
			info, err := bder.Create(opts.name, args[0], flagSetters...)
			if err != nil {
				return err
			}

			if len(opts.env) > 0 {
				if err := runRender([]string{info.MountPoint}, opts.env); err != nil {
					return err
				}
			}

			if !opts.short {
				printCommands(opts.name, opts.env, info)
				logger.Info("Mount point: %s", info.MountPoint)
			} else {
				fmt.Println(info.MountPoint)
			}

			if !unshare.IsRootless() {
				return nil
			}
			args = args[1:]
			if len(args) < 1 {
				shell, shellSet := os.LookupEnv("SHELL")
				if !shellSet {
					logger.Error("no command specified and no `SHELL` env set")
					os.Exit(1)
				}
				args = []string{shell}
			}
			// nosemgrep: go.lang.security.audit.dangerous-exec-command.dangerous-exec-command
			cmd := exec.Command(args[0], args[1:]...)
			cmd.Env = unshare.RootlessEnv()
			cmd.Stdin = os.Stdin
			cmd.Stdout = os.Stdout
			cmd.Stderr = os.Stderr
			mountEnvs, unmountMounts, err := unshareMount(bder.(*realImpl).store, []string{info.ContainerID})
			if err != nil {
				return err
			}
			cmd.Env = append(cmd.Env, mountEnvs...)
			unshare.ExecRunnable(cmd, unmountMounts)
			os.Exit(1)
			return nil
		},
	}
	opts.RegisterFlags(createCmd.Flags())
	return createCmd
}

func runRender(mountPoints []string, env []string) error {
	eg, _ := errgroup.WithContext(context.Background())
	envs := maps.FromSlice(env)

	for _, mountPoint := range mountPoints {
		mp := mountPoint
		eg.Go(func() error {
			if !file.IsExist(mp) {
				logger.Debug("MountPoint %s does not exist, skipping", mp)
				return nil
			}
			return stringsutil.RenderTemplatesWithEnv(mp, envs)
		})
	}

	return eg.Wait()
}

func printCommands(name string, env []string, info buildah.BuilderInfo) {
	envs := maps.Merge(maps.FromSlice(info.OCIv1.Config.Env), maps.FromSlice(env))
	mapping := expansion.MappingFuncFor(envs)

	typeKey := maps.GetFromKeys(info.OCIv1.Config.Labels, v2.ImageTypeKeys...)

	cmds := make([]string, 0)
	for i := range info.OCIv1.Config.Entrypoint {
		cmds = append(cmds, guest.FormalizeWorkingCommand(name, info.Container, v2.ImageType(typeKey), expansion.Expand(info.OCIv1.Config.Entrypoint[i], mapping)))
	}

	for i := range info.OCIv1.Config.Cmd {
		cmds = append(cmds, guest.FormalizeWorkingCommand(name, info.Container, v2.ImageType(typeKey), expansion.Expand(info.OCIv1.Config.Cmd[i], mapping)))
	}

	logger.Info("Shell command: %s", stringsutil.RenderShellWithEnv(strings.Join(cmds, "; "), envs))
}
