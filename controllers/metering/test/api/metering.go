package api

import (
	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
	baseapi "github.com/labring/sealos/test/api"
)

const meteringYaml = `
apiVersion: metering.sealos.io/v1
kind: Metering
metadata:
  name: ${name}
  namespace: ${namespace}
`

func GetMetering(namespace string, name string) (*meteringv1.Metering, error) {
	gvr := meteringv1.GroupVersion.WithResource("meterings")
	var metering meteringv1.Metering
	if err := baseapi.GetObject(namespace, name, gvr, &metering); err != nil {
		return nil, err
	}
	return &metering, nil
}

func DeleteMetering(namespace string, name string) error {
	_, err := baseapi.KubeDeleteFromTemplate(meteringYaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
	if err != nil {
		return err
	}
	return nil
}
