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
	"fmt"
	"os"

	"github.com/labring/image-cri-shim/pkg/cri"
	"github.com/spf13/cobra"
	utilsexec "k8s.io/utils/exec"

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
	}
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
			fmt.Println(criSocket)
		},
	}
	return criSocketCmd
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
			criRuntimeInterface := criRuntime()
			driver, err := criRuntimeInterface.CGroupDriver()
			if err != nil {
				logger.Error(err)
				os.Exit(1)
			}
			if shortPrint {
				fmt.Println(driver)
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
