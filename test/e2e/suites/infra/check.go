/*
Copyright 2023 cuisongliu@qq.com.

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

package infra

import (
	"fmt"
	"os"

	"github.com/labring/sealos/test/e2e/testhelper/utils"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/test/e2e/testhelper/settings"
)

type FakeInfra struct {
	ImageName      string
	ImageTar       string
	PatchImageName string
	PatchImageTar  string
	InfraDriver    string
	TestDir        string
	/*
		if baseImageName ond baseImageTar both not set, use default ImageName (registry.cn-hongkong.aliyuncs.com/labring/kubernetes:v1.25.6) .
		if ImageTar is set, will use tar to load image; else if baseImageName is set, will pull image with baseImageName.
		if patchImageTar is set, will use tar to load patch image; else if patchImageName is set, will pull image with patchImageName.
		if patchImageTar and patchImageName are both set, will use patchImageTar to load image.
		if patchImageTar or patchImageName is set, merge patch image with base image.
	*/
	ClusterName string
}

func NewFakeInfra() *FakeInfra {
	return &FakeInfra{}
}

func (f *FakeInfra) PreSetEnv() {
	f.ImageName = settings.GetEnvWithDefault(settings.TestImageName, settings.DefaultTestImageName)
	f.ImageTar = os.Getenv(settings.TestImageTar)
	f.PatchImageTar = os.Getenv(settings.TestPatchImageTar)
	f.PatchImageName = os.Getenv(settings.TestPatchImageName)
	f.InfraDriver = settings.GetEnvWithDefault(settings.TestInfra, settings.DefaultInfraDriver)
	f.TestDir = settings.GetEnvWithDefault(settings.TestDir, settings.DefaultTestDir)
	f.ClusterName = settings.GetEnvWithDefault(settings.TestClusterName, settings.DefaultTestClusterName)
}

func (f *FakeInfra) PreCheckEnv() {
	if f.InfraDriver == "aliyun" {
		utils.CheckEnvSetting([]string{"ALIYUN_REGION_ID", "ALIYUN_ACCESS_KEY_ID", "ALIYUN_ACCESS_KEY_SECRET", "ALIYUN_REGION_ID"})
	}
	if f.ImageName == "" {
		if f.ImageTar != "" {
			utils.CheckErr(fmt.Errorf("image name is empty, please set env %s", settings.TestImageName))
		}
	}
	logger.Info("e2e test image name is %s", f.ImageName)
	logger.Info("e2e test infra driver is %s", f.InfraDriver)
	if f.ImageTar != "" {
		if !utils.IsFileExist(f.ImageTar) {
			utils.CheckErr(fmt.Errorf("image tar is not exist, path: %s", f.ImageTar))
		}
		logger.Info("e2e test image tar path is %s", f.ImageTar)
	}
	if f.PatchImageTar != "" {
		if !utils.IsFileExist(f.PatchImageTar) {
			utils.CheckErr(fmt.Errorf("image tar is not exist, path: %s", f.PatchImageTar))
		}
		logger.Info("e2e test patch image tar path is %s", f.PatchImageTar)
		if f.PatchImageName == "" {
			utils.CheckErr(fmt.Errorf("patch image name is empty, please set env %s", settings.TestPatchImageName))
		}
		logger.Info("e2e test patch image name is %s", f.PatchImageName)
	}
}
