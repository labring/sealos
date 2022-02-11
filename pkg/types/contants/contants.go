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

package contants

import "github.com/fanux/sealos/pkg/utils/file"

const (
	DefaultLvsCareImage  = "sealyun.hub:5000/sealyun/lvscare:latest"
	DefaultConfigFile    = "/config.yaml"
	LvsCareStaticPodName = "kube-sealyun-lvscare"
)

var (
	DefaultConfigPath = file.UserHomeDir() + "/.sealos"
)
