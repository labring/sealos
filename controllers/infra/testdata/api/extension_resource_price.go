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
