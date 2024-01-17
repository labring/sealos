// Copyright © 2023 sealos.
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

import "os"

/*
   need set ALIYUN_REGION_ID, ALIYUN_ACCESS_KEY_ID, ALIYUN_ACCESS_KEY_SECRET
*/

const (
	Prefix           = "SEALOS_E2E_TEST_"
	DefaultWaiteTime = Prefix + "DEFAULT_WAITE_TIME"
	MaxWaiteTime     = Prefix + "MAX_WAITE_TIME"

	TestImageName      = Prefix + "IMAGE_NAME"
	TestImageTar       = Prefix + "IMAGE_TAR"
	TestPatchImageName = Prefix + "PATCH_IMAGE_NAME"
	TestPatchImageTar  = Prefix + "PATCH_IMAGE_TAR"
	TestDEBUG          = Prefix + "DEBUG"
	TestInfra          = Prefix + "EST_INFRA"
	TestClusterName    = Prefix + "CLUSTER_NAME"
	TestRunImages      = Prefix + "RUN_IMAGES"
	TestDir            = Prefix + "TEST_DIR"
	TestSealosBinPath  = Prefix + "SEALOS_BIN_PATH"
)

func GetEnvWithDefault(key, defaultValue string) string {
	value, ok := os.LookupEnv(key)
	if !ok || value == "" {
		return defaultValue
	}
	return value
}
