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

package filesize

import (
	"crypto/tls"
	"net/http"

	"github.com/fanux/sealos/pkg/logger"
)

//Do is fetch file size
func Do(url string) int64 {
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}

	client := &http.Client{Transport: tr}
	resp, err := client.Get(url)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[globals] get file size is error： %s", r)
		}
	}()
	if err != nil {
		panic(err)
	}
	resp.Body.Close()
	return resp.ContentLength
}
