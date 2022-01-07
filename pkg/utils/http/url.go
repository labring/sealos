/*
Copyright 2021 cuisongliu@qq.com.

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

package http

import (
	"crypto/tls"
	"net/http"
	"net/url"

	"github.com/fanux/sealos/pkg/utils/file"
)

func URICheck(pkgURL string) bool {
	if _, ok := IsURL(pkgURL); !ok && !file.IsExist(pkgURL) {
		return false
	}
	// 判断PkgUrl, 有http前缀时, 下载的文件如果小于400M ,则报错.
	if _, ok := IsURL(pkgURL); ok && !URLCheck(pkgURL) {
		return false
	}
	return true
}
func URLCheck(pkgURL string) bool {
	if u, ok := IsURL(pkgURL); ok {
		req, err := http.NewRequest("GET", u.String(), nil)
		if err != nil {
			//logger.Error("Your package url is incorrect.", "please check where your PkgUrl is right?") // 离线安装包为http路径不对
			return false
		}
		client := &http.Client{
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
			},
		}
		_, err = client.Do(req)
		if err != nil {
			//logger.Error(err)
			return false
		}
	}
	return true
}

func IsURL(u string) (url.URL, bool) {
	if uu, err := url.Parse(u); err == nil && uu != nil && uu.Host != "" {
		return *uu, true
	}
	return url.URL{}, false
}
