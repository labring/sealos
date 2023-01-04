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
	"errors"
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/utils/exec"
)

func newRegistryPruneCmd() *cobra.Command {
	var configPath string
	var dryRun, deleteUntagged bool
	var registryImagePruneCmd = &cobra.Command{
		Use:   "prune",
		Short: "registry `garbage-collect` deletes layers not referenced by any manifests",
		Args:  cobra.ExactArgs(0),
		RunE: func(cmd *cobra.Command, args []string) error {
			registryShell := fmt.Sprintf("%s garbage-collect %s --delete-untagged=%t --dry-run=%t", "registry", configPath, deleteUntagged, dryRun)
			data, err := exec.RunBashCmd(registryShell)
			if err != nil {
				return err
			}
			_, _ = os.Stdout.Write([]byte(data))
			return nil
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			_, ok := exec.CheckCmdIsExist("registry")
			if !ok {
				return errors.New("registry not found")
			}
			if configPath == "" {
				return errors.New("config path is empty")
			}
			return nil
		},
	}
	registryImagePruneCmd.PersistentFlags().StringVarP(&configPath, "config", "c", "/etc/registry/registry_config.yml", "registry config path")
	registryImagePruneCmd.PersistentFlags().BoolVarP(&dryRun, "dry-run", "d", false, "do everything except remove the blobs")
	registryImagePruneCmd.PersistentFlags().BoolVarP(&deleteUntagged, "delete-untagged", "u", false, "delete manifests that are not currently referenced via tag")
	return registryImagePruneCmd
}
