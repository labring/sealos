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
	"github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/logger"
	"github.com/fanux/sealos/pkg/utils/maps"
	"github.com/spf13/cobra"
	"os"
)

func NewRegistryImageCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "registry",
		Short: "registry images manager",
		//Run: func(cmd *cobra.Command, args []string) {
		//
		//},
	}

	return cmd
}

func NewRegistryImagePullCmd() *cobra.Command {
	var registryDir string
	var auths []string

	var cmd = &cobra.Command{
		Use:   "pull",
		Short: "registry images manager pull to local dir",
		//Run: func(cmd *cobra.Command, args []string) {
		//
		//},
	}

	cmd.PersistentFlags().StringVar(&registryDir, "data-dir", "/var/lib/registry", "registry data dir path")
	cmd.PersistentFlags().StringSliceVar(&auths, "auths", []string{}, "auths data for login mirror registry, format example is \"address=docker.io,auth=YWRtaW46YWRtaW4=\".")

	return cmd
}

func NewRegistryImagePullRawCmd() *cobra.Command {
	var imageFile string

	var cmd = &cobra.Command{
		Use:   "raw",
		Short: "registry images manager pull to local dir by raw type",
		Run: func(cmd *cobra.Command, args []string) {

		},
		PreRun: func(cmd *cobra.Command, args []string) {

		},
	}

	cmd.PersistentFlags().StringVarP(&imageFile, "image-file", "f", "ImageFile", "ImageFile path")
	return cmd
}

func NewRegistryImagePullYamlCmd() *cobra.Command {
	var imageFile string

	var cmd = &cobra.Command{
		Use:   "yaml",
		Short: "registry images manager pull to local dir by yaml type",
		//Run: func(cmd *cobra.Command, args []string) {
		//
		//},
	}

	cmd.PersistentFlags().StringVarP(&imageFile, "yaml-path", "p", "", "yaml data dir path")
	return cmd
}

func validateRegistryImagePull(registryDir string, auths []string) {
	if !file.IsExist(registryDir) {
		logger.Error("registry data dir is not exist")
		os.Exit(1)
	}
	for _, a := range auths {
		auth := maps.StringToMap(a)
		if _, ok := auth["address"]; !ok {
			logger.Error("auths format is error, format is \"address=docker.io,auth=YWRtaW46YWRtaW4=\".")
			os.Exit(1)
		}
	}
}
