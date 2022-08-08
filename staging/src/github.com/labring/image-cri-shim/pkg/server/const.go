// Copyright © 2022 sealos.
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

package server

import (
	"strings"
	"time"

	img "github.com/labring/sealos/pkg/utils/images"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/util/wait"
)

const (
	// SealosShimSock is the CRI socket the shim listens on.
	SealosShimSock = "/var/run/image-cri-shim.sock"
	// DirPermissions is the permissions to create the directory for sockets with.
	DirPermissions = 0711
)

var ShimImages []string
var Debug = false
var (
	Base64Auth string
	Auth       string
	ConfigFile string
	SealosHub  string
)

func getData() map[string]interface{} {
	data, err := yaml.Unmarshal(ConfigFile)
	if err != nil {
		logger.Warn("load config from image shim: %v", err)
		return nil
	}
	return data
}

func getRegistryDomain() string {
	domain := SealosHub
	domain = strings.ReplaceAll(domain, "http://", "")
	domain = strings.ReplaceAll(domain, "https://", "")
	return domain
}

func RunLoad() {
	data := getData()
	imageDir, _, _ := unstructured.NestedString(data, "image")
	sync, _, _ := unstructured.NestedInt64(data, "sync")
	if sync != 0 {
		go wait.Forever(func() {
			images, err := img.LoadImages(imageDir)
			if err != nil {
				logger.Warn("load images from image dir: %v", err)
			}
			ShimImages = images
			logger.Info("sync image list for image dir,sync second is %d,data is %+v", sync, images)
		}, time.Duration(sync*int64(time.Second)))
	}
}
