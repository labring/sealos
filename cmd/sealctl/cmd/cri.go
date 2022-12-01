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

package cmd

import (
	"os"
	"strconv"
	"strings"

	"github.com/spf13/cobra"
	utilsexec "k8s.io/utils/exec"

	"github.com/labring/image-cri-shim/pkg/cri"

	"github.com/labring/sealos/pkg/utils/logger"
)

var (
	criSocketPath string
	criConfigPath string
)

func newCRICmd() *cobra.Command {
	var criCmd = &cobra.Command{
		Use:   "cri",
		Short: "cri manager",
		//Run: func(cmd *cobra.Command, args []string) {
		//
		//},
	}
	criCmd.AddCommand(newIsDockerCmd())
	criCmd.AddCommand(newIsRunningCmd())
	criCmd.AddCommand(newListKubeContainersCmd())
	criCmd.AddCommand(newRemoveContainersCmd())
	criCmd.AddCommand(newPullImageCmd())
	criCmd.AddCommand(newImageExistsCmd())
	criCmd.AddCommand(newCGroupDriverCmd())
	criCmd.AddCommand(newCRISocketCmd())
	criCmd.PersistentFlags().StringVar(&criSocketPath, "socket-path", "", "cri socket path")
	criCmd.PersistentFlags().StringVar(&criConfigPath, "config", "", "cri config file")

	return criCmd
}

func newCRISocketCmd() *cobra.Command {
	var criSocketCmd = &cobra.Command{
		Use:   "socket",
		Short: "cri manager socket",
		Run: func(cmd *cobra.Command, args []string) {
			criSocket, err := cri.DetectCRISocket()
			if err != nil {
				logger.Error(err)
				return
			}
			println(criSocket)
		},
	}
	return criSocketCmd
}

func newIsDockerCmd() *cobra.Command {
	var isDockerCmd = &cobra.Command{
		Use:   "is-docker",
		Short: "cri manager is-docker",
		PreRun: func(cmd *cobra.Command, args []string) {
			criCheck()
		},
		Run: func(cmd *cobra.Command, args []string) {
			runtime := criRuntime()
			isDocker := runtime.IsDocker()
			println(strconv.FormatBool(isDocker))
		},
	}
	return isDockerCmd
}

func newIsRunningCmd() *cobra.Command {
	var shortPrint bool
	var isRunningCmd = &cobra.Command{
		Use:   "is-running",
		Short: "cri manager is-running",
		PreRun: func(cmd *cobra.Command, args []string) {
			criCheck()
		},
		Run: func(cmd *cobra.Command, args []string) {
			runtime := criRuntime()
			err := runtime.IsRunning()
			if shortPrint {
				println(strconv.FormatBool(err == nil))
				return
			}
			if err != nil {
				logger.Error(err)
				return
			}
			logger.Info("container runtime is running")
		},
	}
	isRunningCmd.Flags().BoolVar(&shortPrint, "short", false, "if true, print just result.")
	return isRunningCmd
}

func newListKubeContainersCmd() *cobra.Command {
	var sPrint bool
	var listKubeContainersCmd = &cobra.Command{
		Use:   "list-containers",
		Short: "cri manager list-containers",
		PreRun: func(cmd *cobra.Command, args []string) {
			criCheck()
		},
		Run: func(cmd *cobra.Command, args []string) {
			runtime := criRuntime()
			containers, err := runtime.ListKubeContainers()
			if err != nil {
				logger.Error(err)
				os.Exit(1)
			}
			if sPrint {
				println(strings.Join(containers, ","))
				return
			}
			logger.Info("container runtime containers is %+v", containers)
		},
	}
	listKubeContainersCmd.Flags().BoolVar(&sPrint, "short", false, "if true, print just result.")
	return listKubeContainersCmd
}

func newRemoveContainersCmd() *cobra.Command {
	var containers []string
	var removeContainersCmd = &cobra.Command{
		Use:   "remove-containers",
		Short: "cri manager remove-containers",
		PreRun: func(cmd *cobra.Command, args []string) {
			criCheck()
			if len(containers) == 0 {
				logger.Error("container runtime containers is empty.")
				os.Exit(1)
			}
		},
		Run: func(cmd *cobra.Command, args []string) {
			runtime := criRuntime()
			err := runtime.RemoveContainers(containers)
			if err != nil {
				logger.Error(err)
				return
			}
			logger.Info("container runtime remove containers %+v success.", containers)
		},
	}
	removeContainersCmd.Flags().StringSliceVar(&containers, "containers", []string{}, "containers name list")
	return removeContainersCmd
}

func newPullImageCmd() *cobra.Command {
	var imageName string
	var pullImageCmd = &cobra.Command{
		Use:   "pull-image",
		Short: "cri manager pull-image",
		PreRun: func(cmd *cobra.Command, args []string) {
			criCheck()
			if imageName == "" {
				logger.Error("container runtime pull image name  is empty.", imageName)
				os.Exit(1)
			}
		},
		Run: func(cmd *cobra.Command, args []string) {
			runtime := criRuntime()
			err := runtime.PullImage(imageName)
			if err != nil {
				logger.Error(err)
				return
			}
			logger.Info("container runtime pull image %s success.", imageName)
		},
	}
	pullImageCmd.Flags().StringVar(&imageName, "image", "", "image name")
	return pullImageCmd
}

func newImageExistsCmd() *cobra.Command {
	var shortPrint bool
	var imageName string
	var imageExistsCmd = &cobra.Command{
		Use:   "image-exists",
		Short: "cri manager image-exists",
		PreRun: func(cmd *cobra.Command, args []string) {
			criCheck()
			if imageName == "" {
				logger.Error("container runtime image exists name is empty.", imageName)
				os.Exit(1)
			}
		},
		Run: func(cmd *cobra.Command, args []string) {
			runtime := criRuntime()
			b := runtime.ImageExists(imageName)
			if shortPrint {
				println(strconv.FormatBool(b))
				return
			}
			if !b {
				logger.Warn("container runtime image name %s is not exists", imageName)
				return
			}
			logger.Info("container runtime image name %s is exists", imageName)
		},
	}
	imageExistsCmd.Flags().BoolVar(&shortPrint, "short", false, "if true, print just result.")
	return imageExistsCmd
}

func newCGroupDriverCmd() *cobra.Command {
	var shortPrint bool
	var cGroupDriverCmd = &cobra.Command{
		Use:   "cgroup-driver",
		Short: "cri manager cgroup-driver",
		PreRun: func(cmd *cobra.Command, args []string) {
			criCheck()
		},
		Run: func(cmd *cobra.Command, args []string) {
			runtime := criRuntime()
			driver, err := runtime.CGroupDriver()
			if err != nil {
				logger.Error(err)
				os.Exit(1)
			}
			if shortPrint {
				println(driver)
				return
			}
			logger.Info("container runtime cgroup-driver is %s", driver)
		},
	}
	cGroupDriverCmd.Flags().BoolVar(&shortPrint, "short", false, "if true, print just result.")
	return cGroupDriverCmd
}

func criCheck() {
	var err error
	if criSocketPath == "" {
		criSocketPath, err = cri.DetectCRISocket()
	}
	if err != nil {
		logger.Error(err)
		os.Exit(1)
	}
}

func criRuntime() cri.ContainerRuntime {
	rt, err := cri.NewContainerRuntime(utilsexec.New(), criSocketPath, criConfigPath)
	if err != nil {
		logger.Error(err)
		os.Exit(1)
	}
	return rt
}

func init() {
	rootCmd.AddCommand(newCRICmd())
}
