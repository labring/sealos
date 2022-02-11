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

package install

import (
	v1 "github.com/fanux/sealos/pkg/types/v1alpha1"
	"github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/http"
	"github.com/fanux/sealos/pkg/utils/logger"
)

var message string

// ExitInitCase is
func ExitInitCase() bool {
	// 重大错误直接退出, 不保存配置文件
	if len(v1.MasterIPs) == 0 {
		message = ErrorMasterEmpty
	}
	if v1.Version == "" {
		message += ErrorVersionEmpty
	}
	// 用户不写 --passwd, 默认走pk, 秘钥如果没有配置ssh互信, 则验证ssh的时候报错. 应该属于preRun里面
	// first to auth password, second auth pk.
	// 如果初始状态都没写, 默认都为空. 报这个错
	//if SSHConfig.Password == "" && SSHConfig.PkFile == "" {
	//	message += ErrorMessageSSHConfigEmpty
	//}
	if message != "" {
		logger.Error(message + "please check your command is ok?")
		return true
	}

	if !http.URICheck(v1.PkgURL) {
		logger.Error(ErrorFileNotExist + "please check where your PkgUrl is right?")
		return true
	}

	return false
}

func ExitDeleteCase(pkgURL string) bool {
	if v1.PackageConfig != "" && !file.IsExist(v1.PackageConfig) {
		logger.Error("your APP pkg-config File is not exist, Please check your pkg-config is exist")
		return true
	}
	if !http.URICheck(pkgURL) {
		logger.Error(ErrorFileNotExist + "please check where your PkgUrl is right?")
		return true
	}
	return false
}

func ExitInstallCase(pkgURL string) bool {
	// values.yaml 使用了-f 但是文件不存在. 并且不使用 stdin
	if v1.Values != "-" && !file.IsExist(v1.Values) && v1.Values != "" {
		logger.Error("your values File is not exist and you have no stdin input, Please check your Values.yaml is exist")
		return true
	}
	// PackageConfig 使用了-c 但是文件不存在
	if v1.PackageConfig != "" && !file.IsExist(v1.PackageConfig) {
		logger.Error("your install APP pkg-config File is not exist, Please check your pkg-config is exist")
		return true
	}
	if !http.URICheck(pkgURL) {
		logger.Error(ErrorFileNotExist + "please check where your PkgUrl is right?")
		return true
	}
	return false
}
