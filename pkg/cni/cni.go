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

package cni

import (
	"strings"

	"github.com/fanux/sealos/pkg/types/v1beta1"
)

type CNI struct {
	Interface string
	CIDR      string
	IPIP      string
	MTU       string
}

type Interface interface {
	Manifests(template string) string
}

func (c *CNI) Manifests(template string) string {
	template = strings.ReplaceAll(template, v1beta1.DefaultVarCNIInterface, c.Interface)
	template = strings.ReplaceAll(template, v1beta1.DefaultVarCNICIDR, c.CIDR)
	template = strings.ReplaceAll(template, v1beta1.DefaultVarCNIIPIP, c.IPIP)
	template = strings.ReplaceAll(template, v1beta1.DefaultVarCNIMTU, c.MTU)
	return template
}
