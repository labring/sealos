/*
Copyright 2023 yxxchange@163.com.

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
package cloudclient

import (
	"errors"
	"io/ioutil"
	"net/http"

	lgr "github.com/labring/sealos/pkg/utils/logger"
)

type CloudClient struct {
	CloudURL string
	HttpBody []byte
}

func (cc *CloudClient) Get() error {
	resp, err := http.Get(cc.CloudURL)

	if err != nil {
		lgr.Error("Laf cloud connection error: ", err)
		return err
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		lgr.Error("StatusCode error", err)
		return errors.New("error: StatusCode is Not OK")
	}

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		lgr.Error(err)
		return nil
	}
	cc.HttpBody = body
	return nil
}

func (cc *CloudClient) Init() {
	cc.CloudURL = "https://hfx0m9.laf.dev/CloudNotification"
}
