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

package runtime

import (
	"fmt"
	"path"

	"github.com/labring/sealos/pkg/utils/contants"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

var defaultRootDirectory = "/var/lib/image-cri-shim"

//GetImageShim default dir is /var/lib/image-cri-shim
func GetImageShim(rootfs string) string {
	const imageCustomConfig = "image-cri-shim.yaml"
	etcPath := path.Join(rootfs, contants.EtcDirName, imageCustomConfig)
	registryConfig, err := yaml.Unmarshal(etcPath)
	if err != nil {
		logger.Debug("use default registry config")
		return defaultRootDirectory
	}
	image, _, _ := unstructured.NestedString(registryConfig, "image")
	logger.Debug("show image shim info, image dir : %s ", image)
	return image
}

func ApplyImageShimCMD(rootfs string) string {
	shimData := GetImageShim(rootfs)
	return fmt.Sprintf(contants.DefaultCPFmt, shimData, path.Join(rootfs, contants.ImagesDirName, contants.ImageShimDirName), shimData)
}

func DeleteImageShimCMD(rootfs string) string {
	return fmt.Sprintf("rm -rf %s", GetImageShim(rootfs))
}
