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

package settings

import (
	"os"
	"time"

	"github.com/labring/sealos/pkg/types/v1beta1"

	"github.com/labring/sealos/test/e2e/suites/cmd"
)

type Config struct {
	WaitTime      time.Duration
	MaxWaiteTime  time.Duration
	SSH           *v1beta1.SSH
	InfraDriver   string
	SealosBinPath string
	SealosCmd     *cmd.SealosCmd
	TestDir       string
	/*
		if baseImageName ond baseImageTar both not set, use default ImageName (hub.sealos.cn/labring/kubernetes:v1.25.6) .
		if ImageTar is set, will use tar to load image; else if baseImageName is set, will pull image with baseImageName.
		if patchImageTar is set, will use tar to load patch image; else if patchImageName is set, will pull image with patchImageName.
		if patchImageTar and patchImageName are both set, will use patchImageTar to load image.
		if patchImageTar or patchImageName is set, merge patch image with base image.
	*/
	ClusterName    string
	ImageName      string
	ImageTar       string
	PatchImageName string
	PatchImageTar  string
}

var E2EConfig *Config

// init test params and settings
func init() {
	E2EConfig = &Config{}
	E2EConfig.loadFromEnv()
	defaultWaiteTime := os.Getenv(SEALOS_E2E_TEST_DEFAULT_WAITE_TIME)
	if defaultWaiteTime == "" {
		E2EConfig.WaitTime = 300 * time.Second
	} else {
		E2EConfig.WaitTime, _ = time.ParseDuration(defaultWaiteTime)
	}
	maxWaiteTime := os.Getenv(SEALOS_E2E_TEST_MAX_WAITE_TIME)
	if maxWaiteTime == "" {
		E2EConfig.MaxWaiteTime = 2400 * time.Second
	} else {
		E2EConfig.MaxWaiteTime, _ = time.ParseDuration(maxWaiteTime)
	}
}

func (c *Config) loadFromEnv() {
	c.ImageName = os.Getenv(SEALOS_E2E_TEST_IMAGE_NAME)
	c.ImageTar = os.Getenv(SEALOS_E2E_TEST_IMAGE_TAR)
	c.ClusterName = getEnvWithDefault(SEALOS_E2E_TEST_CLUSTER_NAME, DefaultTestClusterName)
	c.TestDir = getEnvWithDefault(SEALOS_E2E_TEST_TEST_DIR, DefaultTestDir)
	c.PatchImageName = os.Getenv(SEALOS_E2E_TEST_PATCH_IMAGE_NAME)
	c.PatchImageTar = os.Getenv(SEALOS_E2E_TEST_PATCH_IMAGE_TAR)
	c.InfraDriver = getEnvWithDefault(SEALOS_E2E_TEST_INFRA, DefaultInfraDriver)
	c.SealosBinPath = getEnvWithDefault(SEALOS_E2E_TEST_SEALOS_BIN_PATH, DefaultSealosBinPath)
}
