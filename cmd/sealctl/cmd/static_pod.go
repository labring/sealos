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

	"github.com/labring/sealos/pkg/types/v1beta1"

	v1 "k8s.io/api/core/v1"

	"github.com/labring/sealos/pkg/utils/yaml"

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
	}
	// check route for host
	staticPodCmd.AddCommand(newLvscareCmd())
	staticPodCmd.PersistentFlags().StringVar(&staticPodPath, "path", "/etc/kubernetes/manifests", "default kubernetes static pod path")
	return staticPodCmd
}

type lvscarePod struct {
	vip     string
	master  []string
	image   string
	name    string
	options []string
	print   bool
}

func newLvscareCmd() *cobra.Command {
	var obj lvscarePod
	var setImage bool
	var lvscareCmd = &cobra.Command{
		Use:   "lvscare",
		Short: "generator lvscare static pod file",
		PreRunE: func(cmd *cobra.Command, args []string) error {
			if len(obj.master) == 0 && !setImage {
				return fmt.Errorf("master not allow empty")
			}
			return nil
		},
		RunE: func(cmd *cobra.Command, args []string) error {
			if !setImage {
				return genNewPod(obj)
			}
			return setNewPodImage(obj)
		},
	}
	// manually to set host via gateway
	lvscareCmd.Flags().StringVar(&obj.vip, "vip", "10.103.97.2:6443", "default vip IP")
	lvscareCmd.Flags().StringVar(&obj.name, "name", constants.LvsCareStaticPodName, "generator lvscare static pod name")
	lvscareCmd.Flags().StringVar(&obj.image, "image", v1beta1.DefaultLvsCareImage, "generator lvscare static pod image")
	lvscareCmd.Flags().BoolVar(&setImage, "set-img", false, "update lvscare image to static pod")
	lvscareCmd.Flags().StringSliceVar(&obj.master, "masters", []string{}, "generator masters addrs")
	lvscareCmd.Flags().StringSliceVar(&obj.options, "options", []string{}, "lvscare args options")
	lvscareCmd.Flags().BoolVar(&obj.print, "print", false, "is print yaml")
	return lvscareCmd
}

func genNewPod(obj lvscarePod) error {
	fileName := fmt.Sprintf("%s.%s", obj.name, constants.YamlFileSuffix)
	yaml, err := ipvs.LvsStaticPodYaml(obj.vip, obj.master, obj.image, obj.name, obj.options)
	if err != nil {
		return err
	}
	if obj.print {
		fmt.Println(yaml)
		return nil
	}
	logger.Debug("lvscare static pod yaml is %s", yaml)
	if err = file.MkDirs(staticPodPath); err != nil {
		return fmt.Errorf("init dir is error: %v", err)
	}
	err = os.WriteFile(path.Join(staticPodPath, fileName), []byte(yaml), 0755)
	if err != nil {
		return err
	}
	logger.Info("generator lvscare static pod is success")
	return nil
}

func setNewPodImage(obj lvscarePod) error {
	fileName := fmt.Sprintf("%s.%s", obj.name, constants.YamlFileSuffix)
	podPath := path.Join(staticPodPath, fileName)
	if file.IsExist(podPath) {
		pod := &v1.Pod{}
		if err := yaml.UnmarshalFile(podPath, pod); err != nil {
			return err
		}
		pod.Spec.Containers[0].Image = obj.image
		data, err := ipvs.PodToYaml(*pod)
		if err != nil {
			return err
		}
		if obj.print {
			fmt.Println(string(data))
			return nil
		}
		err = os.WriteFile(path.Join(staticPodPath, fileName), data, 0755)
		if err != nil {
			return err
		}
		logger.Info("update lvscare static pod image is success")
	}
	return nil
}
