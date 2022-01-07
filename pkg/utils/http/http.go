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

package http

import (
	"fmt"
	"path"

	"github.com/fanux/sealos/pkg/utils/exec"
	"github.com/fanux/sealos/pkg/utils/hash"

	"github.com/fanux/sealos/pkg/utils/file"
)

//DownloadFile is
func DownloadFile(location string) (filePATH, md5 string) {
	if _, isURL := IsURL(location); isURL {
		absPATH := "/tmp/sealos/" + path.Base(location)
		if !file.IsExist(absPATH) {
			//generator download cmd
			dwnCmd := downloadCmd(location)
			//os exec download command
			_, _ = exec.RunSimpleCmd("mkdir -p /tmp/sealos && cd /tmp/sealos && " + dwnCmd)
		}
		location = absPATH
	}
	//file md5
	md5 = hash.FileMD5(location)
	return location, md5
}

//根据url 获取command
func downloadCmd(url string) string {
	//only http
	u, isHTTP := IsURL(url)
	var c = ""
	if isHTTP {
		param := ""
		if u.Scheme == "https" {
			param = "--no-check-certificate"
		}
		c = fmt.Sprintf(" wget -c %s %s", param, url)
	}
	return c
}
