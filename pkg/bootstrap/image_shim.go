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

package bootstrap

import (
	"fmt"
	"path"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"
)

var defaultRootDirectory = "/var/lib/image-cri-shim"

type ImageShim struct {
	sshInterface ssh.Interface
	host         string
}

// GetInfo default dir is /var/lib/image-cri-shim
func (is *ImageShim) GetInfo(rootfs string) string {
	const imageCustomConfig = "image-cri-shim.yaml"
	etcPath := path.Join(rootfs, constants.EtcDirName, imageCustomConfig)
	data, _ := is.sshInterface.Cmd(is.host, fmt.Sprintf("cat %s", etcPath))
	logger.Debug("image shim data info: %s", string(data))
	shimConfig, err := yaml.UnmarshalData(data)
	if err != nil {
		logger.Debug("use default image shim config")
		return defaultRootDirectory
	}
	image, _, _ := unstructured.NestedString(shimConfig, "image")
	logger.Debug("show image shim info, image dir : %s ", image)
	return image
}

func (is *ImageShim) ApplyCMD(rootfs string) string {
	shimData := is.GetInfo(rootfs)
	return fmt.Sprintf(constants.DefaultCPFmt, shimData, path.Join(rootfs, constants.ImagesDirName, constants.ImageShimDirName), shimData)
}

func (is *ImageShim) DeleteCMD(rootfs string) string {
	return fmt.Sprintf("rm -rf %s", is.GetInfo(rootfs))
}

func NewImageShimHelper(execer ssh.Interface, host string) *ImageShim {
	return &ImageShim{execer, host}
}
