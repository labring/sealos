/*
Copyright 2022 cuisongliu@qq.com.

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

package utils

import (
	"fmt"
	http2 "net/http"
	"net/url"
	"strings"
	"time"

	"github.com/labring/endpoints-operator/library/probe/http"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/util/json"
)

func HTTP(address string, header map[string]string) (string, error) {
	prob := http.New(false)
	timeout := time.Duration(10) * time.Second
	url, err := url.Parse(address)
	if url != nil {
		head := http2.Header{}
		for k, v := range header {
			head.Add(k, v)
		}
		_, data, err := prob.Probe(url, head, timeout)
		return data, err
	}
	return "", errors.Wrap(err, "convert url error")
}

func RegistryHasImage(registryAddress, registryBase64Auth, imageName string) bool {
	images := strings.Split(imageName, ":")
	if len(images) > 1 {
		imageName = images[0]
	}
	var tag string
	if len(images) == 2 {
		tag = images[1]
	} else {
		tag = "latest"
	}
	type RegistryData struct {
		Name string   `json:"name"`
		Tags []string `json:"tags"`
	}
	var registry RegistryData
	logger.Info("address: %s,base64: %s,imageName: %s", registryAddress, registryBase64Auth, imageName)
	logger.Info("pre image name: %s, pre image tag %s", imageName, tag)
	data, _ := HTTP(fmt.Sprintf("%s/v2/%s/tags/list", registryAddress, imageName), map[string]string{"Authorization": "Basic " + registryBase64Auth})
	if data != "" {
		logger.Info("data: %s", data)
		err := json.Unmarshal([]byte(data), &registry)
		if err != nil {
			logger.Warn("convert registry data error")
			return false
		}
	}
	if In(tag, registry.Tags) {
		logger.Info("tag in registry.Tags")
		return true
	}
	return false
}

func In(key string, slice []string) bool {
	logger.Info("target %s,source:%+v", key, slice)
	for _, s := range slice {
		if key == s {
			return true
		}
	}
	return false
}
