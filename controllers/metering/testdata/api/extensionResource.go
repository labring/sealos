package api

import (
	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
)

const extensionResourcePrice = `
apiVersion: metering.sealos.io/v1
kind: ExtensionResourcesPrice
metadata:
  name: ${name}
  namespace: ${namespace}
`

func GetExtensionResourcePrice(namespace string, name string) (*meteringv1.ExtensionResourcesPrice, error) {
	gvr := meteringv1.GroupVersion.WithResource("extensionresourcesprices")
	var extensionResourcesPrice meteringv1.ExtensionResourcesPrice
	if err := baseapi.GetObject(namespace, name, gvr, &extensionResourcesPrice); err != nil {
		return nil, err
	}
	return &extensionResourcesPrice, nil
}

func DeleteExtensionResourcePrice(namespace string, name string) error {
	_, err := baseapi.KubeDeleteFromTemplate(extensionResourcePrice, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
	if err != nil {
		return err
	}
	return nil
}
