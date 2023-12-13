/*
Copyright 2022 cuisongliu@qq.com.

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

package rootfs

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"path/filepath"
	"strings"

	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/env"
	"github.com/labring/sealos/pkg/exec"
	"github.com/labring/sealos/pkg/filesystem"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	executils "github.com/labring/sealos/pkg/utils/exec"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/maps"
	stringsutil "github.com/labring/sealos/pkg/utils/strings"
)

type defaultRootfs struct {
	mounts []v2.MountImage
}

func (f *defaultRootfs) MountRootfs(cluster *v2.Cluster, hosts []string) error {
	return f.mountRootfs(cluster, hosts)
}

func (f *defaultRootfs) UnMountRootfs(cluster *v2.Cluster, hosts []string) error {
	return f.unmountRootfs(cluster, hosts)
}

func (f *defaultRootfs) mountRootfs(cluster *v2.Cluster, ipList []string) error {
	pathResolver := constants.NewPathResolver(cluster.Name)
	target := pathResolver.RootFSPath()
	ctx := context.Background()
	eg, _ := errgroup.WithContext(ctx)
	envProcessor := env.NewEnvProcessor(cluster)
	// TODO: remove this when rendering on client side is GA
	for _, mount := range f.mounts {
		src := mount
		eg.Go(func() error {
			if !file.IsExist(src.MountPoint) {
				logger.Debug("Image %s not exist, render env continue", src.ImageName)
				return nil
			}
			// TODO: if we are planing to support rendering templates for each host,
			// then move this rendering process before ssh.CopyDir and do it one by one.
			envs := v2.MergeEnvWithBuiltinKeys(src.Env, src)
			err := renderTemplatesWithEnv(src.MountPoint, ipList, envProcessor, envs)
			if err != nil {
				return fmt.Errorf("failed to render env: %w", err)
			}
			dirs, err := file.StatDir(src.MountPoint, true)
			if err != nil {
				return fmt.Errorf("failed to stat files: %w", err)
			}
			if len(dirs) != 0 {
				_, err = executils.RunBashCmd(fmt.Sprintf(constants.DefaultChmodBash, src.MountPoint))
				if err != nil {
					return fmt.Errorf("run chmod to rootfs failed: %w", err)
				}
			}
			return nil
		})
	}
	if err := eg.Wait(); err != nil {
		return err
	}

	sshClient := ssh.NewCacheClientFromCluster(cluster, true)
	execer, err := exec.New(sshClient)
	if err != nil {
		return err
	}

	notRegistryDirFilter := func(entry fs.DirEntry) bool { return !constants.IsRegistryDir(entry) }

	copyFn := func(m v2.MountImage, targetHost, targetDir string) error {
		logger.Debug("send mount image, target: %s, image: %s, type: %s", targetHost, m.ImageName, m.Type)
		if err := ssh.CopyDir(execer, targetHost, m.MountPoint, targetDir, notRegistryDirFilter); err != nil {
			logger.Error("error occur while sending mount image %s: %v", m.Name, err)
			return err
		}
		return nil
	}

	// only care about envs from rootfs
	rootfs := cluster.GetRootfsImage()
	// would never happened
	if rootfs == nil {
		return errors.New("cannot mount a cluster without rootfs, this is an unexpected bug")
	}
	rootfsEnvs := v2.MergeEnvWithBuiltinKeys(rootfs.Env, *rootfs)

	for idx := range ipList {
		ip := ipList[idx]
		eg.Go(func() error {
			var renderingRequired bool
			for i := range f.mounts {
				if f.mounts[i].IsRootFs() || f.mounts[i].IsPatch() {
					renderingRequired = true
					// contents in rootfs/patch type images cannot be replicated asynchronously
					if err := copyFn(f.mounts[i], ip, target); err != nil {
						return err
					}
				}
			}
			if !renderingRequired {
				return nil
			}
			envs := envProcessor.Getenv(ip)
			envs = maps.Merge(rootfsEnvs, envs)
			envs[v2.ImageRunModeEnvSysKey] = strings.Join(cluster.GetRolesByIP(ip), ",")
			renderCommand := getRenderCommand(pathResolver.RootFSSealctlPath(), target)

			return execer.CmdAsync(ip, stringsutil.RenderShellWithEnv(renderCommand, envs))
		})
	}
	if err := eg.Wait(); err != nil {
		return err
	}

	eg, _ = errgroup.WithContext(ctx)
	master0 := cluster.GetMaster0IPAndPort()
	for idx := range f.mounts {
		mountInfo := f.mounts[idx]
		eg.Go(func() error {
			if mountInfo.IsApplication() {
				targetDir := constants.GetAppWorkDir(cluster.Name, mountInfo.Name)
				if err := copyFn(mountInfo, master0, targetDir); err != nil {
					return err
				}
				renderCommand := getRenderCommand(pathResolver.RootFSSealctlPath(), targetDir)
				return execer.CmdAsync(master0, envProcessor.WrapShell(master0, renderCommand))
			}
			return nil
		})
	}
	return eg.Wait()
}

func getRenderCommand(binary string, target string) string {
	// skip if sealctl doesn't has subcommand render
	return fmt.Sprintf("%s render --debug=%v --clear %s 2>/dev/null || true", binary,
		logger.IsDebugMode(),
		strings.Join([]string{
			filepath.Join(target, constants.EtcDirName),
			filepath.Join(target, constants.ScriptsDirName),
			filepath.Join(target, constants.ManifestsDirName),
		}, " "))
}

func (f *defaultRootfs) unmountRootfs(cluster *v2.Cluster, ipList []string) error {
	clusterRootfsDir := constants.NewPathResolver(cluster.Name).Root()
	rmRootfs := fmt.Sprintf("rm -rf %s", clusterRootfsDir)
	deleteHomeDirCmd := fmt.Sprintf("rm -rf %s", constants.ClusterDir(cluster.Name))
	eg, _ := errgroup.WithContext(context.Background())
	sshClient := ssh.NewCacheClientFromCluster(cluster, true)
	execer, err := exec.New(sshClient)
	if err != nil {
		return err
	}

	for _, IP := range ipList {
		ip := IP
		eg.Go(func() error {
			return execer.CmdAsync(ip, rmRootfs, deleteHomeDirCmd)
		})
	}
	return eg.Wait()
}

func renderTemplatesWithEnv(mountDir string, ipList []string, p env.Interface, envs map[string]string) error {
	// currently only render once
	return p.RenderAll(ipList[0], mountDir, envs)
}

func newDefaultRootfs(mounts []v2.MountImage) (filesystem.Mounter, error) {
	return &defaultRootfs{mounts: mounts}, nil
}

// NewRootfsMounter :according to the Metadata file content to determine what kind of Filesystem will be load.
func NewRootfsMounter(images []v2.MountImage) (filesystem.Mounter, error) {
	return newDefaultRootfs(images)
}
