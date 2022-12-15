package api

import (
	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
)

const ExtensionResourcePriceYaml = `
apiVersion: metering.sealos.io/v1
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

func GetExtensionResourcePrice(namespace string, name string) (*meteringv1.ExtensionResourcePrice, error) {
	gvr := meteringv1.GroupVersion.WithResource("extensionresourceprices")
	var extensionResourcesPrice meteringv1.ExtensionResourcePrice
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
