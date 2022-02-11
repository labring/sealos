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

package v1beta1

var _ AppsV1Beta1Interface = &AppsV1Beta1Client{}

type AppsV1Beta1Interface interface {
	ConfigsGetter
}

// AppsV1Beta1Client is used to interact with features provided by the apps.sealyun.com group.
type AppsV1Beta1Client struct {
}

func (c *AppsV1Beta1Client) Configs() ConfigInterface {
	return newConfigs(c)
}

// NewForConfig creates a new AppsV1Beta1Client for the given config.
func NewForConfig() (*AppsV1Beta1Client, error) {
	return &AppsV1Beta1Client{}, nil
}

// NewForConfigOrDie creates a new AppsV1Beta1Client for the given config and
// panics if there is an error in the config.
func NewForConfigOrDie() *AppsV1Beta1Client {
	client, err := NewForConfig()
	if err != nil {
		panic(err)
	}
	return client
}
