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

//go:build linux
// +build linux

package buildah

import (
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/containers/storage"
	"github.com/containers/storage/pkg/unshare"
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/utils/logger"
)

func newUnshareCommand() *cobra.Command {
	var (
		unshareDescription = "\n  Manually enter unshare mode, runs a command in a modified user namespace."
		unshareCommand     = &cobra.Command{
			Use:    "unshare",
			Hidden: true,
			Short:  "Run a command in a modified user namespace",
			Long:   unshareDescription,
			RunE:   unshareCmd,
			Example: `buildah unshare id
  buildah unshare cat /proc/self/uid_map
  buildah unshare buildah-script.sh`,
		}
		unshareMounts []string
	)
	unshareCommand.SetUsageTemplate(UsageTemplate())
	flags := unshareCommand.Flags()
	flags.SetInterspersed(false)
	flags.StringSliceVarP(&unshareMounts, "mount", "m", []string{}, "mount the specified containers (default [])")
	return unshareCommand
}

func unshareMount(store storage.Store, mounts []string) ([]string, func(), error) {
	if len(mounts) == 0 {
		return nil, nil, nil
	}
	var mountedContainers, env []string
	unmount := func() {
		for _, mounted := range mountedContainers {
			builder, err := openBuilder(getContext(), store, mounted)
			if err != nil {
				fmt.Fprintln(os.Stderr, fmt.Errorf("loading information about build container %q: %w", mounted, err))
				continue
			}
			err = builder.Unmount()
			if err != nil {
				fmt.Fprintln(os.Stderr, fmt.Errorf("unmounting build container %q: %w", mounted, err))
				continue
			}
		}
	}
	for _, mountSpec := range mounts {
		mount := strings.SplitN(mountSpec, "=", 2)
		container := mountSpec
		envVar := container
		if len(mount) == 2 {
			envVar = mount[0]
			container = mount[1]
		}
		builder, err := openBuilder(getContext(), store, container)
		if err != nil {
			unmount()
			return nil, nil, fmt.Errorf("loading information about build container %q: %w", container, err)
		}
		mountPoint, err := builder.Mount(builder.MountLabel)
		if err != nil {
			unmount()
			return nil, nil, fmt.Errorf("mounting build container %q: %w", container, err)
		}
		logger.Debug("mounted container %q at %q", container, mountPoint)
		mountedContainers = append(mountedContainers, container)
		if envVar != "" {
			envSpec := fmt.Sprintf("%s=%s", envVar, mountPoint)
			logger.Debug("adding %q to environment", envSpec)
			env = append(env, envSpec)
		}
	}
	return env, unmount, nil
}

// unshareCmd execs whatever using the ID mappings that we want to use for ourselves
func unshareCmd(c *cobra.Command, args []string) error {
	// Set the default isolation type to use the "rootless" method.
	if _, present := os.LookupEnv("BUILDAH_ISOLATION"); !present {
		if err := os.Setenv("BUILDAH_ISOLATION", "rootless"); err != nil {
			logger.Error("error setting BUILDAH_ISOLATION=rootless in environment: %v", err)
			os.Exit(1)
		}
	}

	// force reexec using the configured ID mappings
	unshare.MaybeReexecUsingUserNamespace(true)
	// exec the specified command, if there is one
	if len(args) < 1 {
		// try to exec the shell, if one's set
		shell, shellSet := os.LookupEnv("SHELL")
		if !shellSet {
			logger.Error("no command specified")
			os.Exit(1)
		}
		args = []string{shell}
	}
	unshareMounts, _ := c.Flags().GetStringSlice("mount")
	store, err := getStore(c)
	bailOnError(err, "cannot get store")
	// Temporary ignore it...
	// nosemgrep: go.lang.security.audit.dangerous-exec-command.dangerous-exec-command
	cmd := exec.Command(args[0], args[1:]...)
	cmd.Env = unshare.RootlessEnv()
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	mountEnvs, unmountMounts, err := unshareMount(store, unshareMounts)
	if err != nil {
		return err
	}
	cmd.Env = append(cmd.Env, mountEnvs...)
	unshare.ExecRunnable(cmd, unmountMounts)
	os.Exit(1)
	return nil
}
