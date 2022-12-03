// Copyright © 2021 sealos.
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

package cmd

import (
	"fmt"
	"os"
	"path"

	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/ipvs"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

var staticPodPath string

func newStaticPodCmd() *cobra.Command {
	var staticPodCmd = &cobra.Command{
		Use:   "static-pod",
		Short: "generator static pod",
		//Run: func(cmd *cobra.Command, args []string) {
		//
		//},
	}
	// check route for host
	staticPodCmd.AddCommand(newLvscareCmd())
	staticPodCmd.PersistentFlags().StringVar(&staticPodPath, "path", constants.KubernetesEtcStaticPod, "default kubernetes static pod path")
	return staticPodCmd
}

func newLvscareCmd() *cobra.Command {
	var vip, image, name string
	var masters []string
	var printBool bool
	var lvscareCmd = &cobra.Command{
		Use:   "lvscare",
		Short: "generator lvscare static pod file",
		PreRun: func(cmd *cobra.Command, args []string) {
			if len(masters) == 0 {
				logger.Error("master not allow empty")
				os.Exit(1)
			}
		},
		Run: func(cmd *cobra.Command, args []string) {
			fileName := fmt.Sprintf("%s.%s", name, constants.YamlFileSuffix)
			yaml, err := ipvs.LvsStaticPodYaml(vip, masters, image, name)
			if err != nil {
				logger.Error(err)
				os.Exit(1)
			}
			if printBool {
				println(yaml)
				return
			}
			logger.Debug("lvscare static pod yaml is %s", yaml)
			if err = file.MkDirs(staticPodPath); err != nil {
				logger.Error("init dir is error: %v", err)
				os.Exit(1)
			}
			err = os.WriteFile(path.Join(staticPodPath, fileName), []byte(yaml), 0755)
			if err != nil {
				logger.Error(err)
				os.Exit(1)
			}
			logger.Info("generator lvscare static pod is success")
		},
	}
	// manually to set host via gateway
	lvscareCmd.Flags().StringVar(&vip, "vip", "10.103.97.2:6443", "default vip IP")
	lvscareCmd.Flags().StringVar(&name, "name", constants.LvsCareStaticPodName, "generator lvscare static pod name")
	lvscareCmd.Flags().StringVar(&image, "image", constants.DefaultLvsCareImage, "generator lvscare static pod image")
	lvscareCmd.Flags().StringSliceVar(&masters, "masters", []string{}, "generator masters addrs")
	lvscareCmd.Flags().BoolVar(&printBool, "print", false, "is print yaml")
	return lvscareCmd
}

func init() {
	rootCmd.AddCommand(newStaticPodCmd())
}
