// Copyright © 2023 sealos.
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

package api

import (
	meteringcommonv1 "github.com/labring/sealos/controllers/common/metering/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
)

const ExtensionResourcePriceYaml = `
apiVersion: metering.common.sealos.io/v1
kind: ExtensionResourcePrice
metadata:
  name: ${name}
  namespace: ${namespace}

spec:
  resourceName: pod
  resources:
    cpu:
      unit: "1"
      price: 1
      describe: "cost per cpu per hour（price:100 = 1¥）"
`

func GetExtensionResourcePrice(namespace string, name string) (*meteringcommonv1.ExtensionResourcePrice, error) {
	gvr := meteringcommonv1.GroupVersion.WithResource("extensionresourceprices")
	var extensionResourcesPrice meteringcommonv1.ExtensionResourcePrice
	if err := baseapi.GetObject(namespace, name, gvr, &extensionResourcesPrice); err != nil {
		return nil, err
	}
	return &extensionResourcesPrice, nil
}

func DeleteExtensionResourcePrice(namespace string, name string) error {
	_, err := baseapi.KubeDeleteFromTemplate(ExtensionResourcePriceYaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
	if err != nil {
		return err
	}
	return nil
}
