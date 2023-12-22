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

package guest

import (
	"fmt"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/types/v1beta1"
)

func FormalizeWorkingCommand(clusterName string, imageName string, t v1beta1.ImageType, cmd string) string {
	if cmd == "" {
		return ""
	}
	switch t {
	case v1beta1.RootfsImage, v1beta1.PatchImage:
		return fmt.Sprintf(constants.CdAndExecCmd, constants.GetRootWorkDir(clusterName), cmd)
	case v1beta1.AppImage, "":
		return fmt.Sprintf(constants.CdAndExecCmd, constants.GetAppWorkDir(clusterName, imageName), cmd)
	}
	return ""
}
