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
