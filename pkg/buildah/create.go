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
	"os"
	"os/exec"

	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/storage/pkg/unshare"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"

	"github.com/labring/sealos/pkg/utils/logger"
)

type createOptions struct {
	name     string
	platform string
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
}

func newCreateCmd() *cobra.Command {
	opts := newDefaultCreateOptions()
	var createCmd = &cobra.Command{
		Use:   "create",
		Short: "Create a cluster without running the CMD, for inspecting image",
		Args:  cobra.MinimumNArgs(1),
		RunE: func(c *cobra.Command, args []string) error {
			oss, arch, variant, err := parse.Platform(opts.platform)
			if err != nil {
				return err
			}
			bder, err := New("")
			if err != nil {
				return err
			}
			info, err := bder.Create(opts.name, args[0],
				WithPlatformOption(v1.Platform{OS: oss, Architecture: arch, Variant: variant}))
			if err != nil {
				return err
			}
			logger.Info("Mount point: %s", info.MountPoint)
			if !IsRootless() {
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
