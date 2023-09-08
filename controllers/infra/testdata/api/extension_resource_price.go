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
  name: extensionresourceprice-sealos-infra-controller
  namespace: infra-system
spec:
  resourceName: infra
  resources:
    infra/CPU:
      describe: cost of per cpu per hour
      price: 670
      unit: '1'
    infra/Memory:
      describe: cost of per memory per hour
      price: 330
      unit: 1G
    infra/Volume:
      describe: cost of per 1G volume per hour
      price: 21
      unit: 1G

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
