package api

import (
	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
	baseapi "github.com/labring/sealos/test/api"
)

const meteringQuotaYaml = `
apiVersion: metering.sealos.io/v1
kind: MeteringQuota
metadata:
  name: ${name}
  namespace: ${namespace}
`

func GetMeteringQuota(namespace string, name string) (*meteringv1.MeteringQuota, error) {
	gvr := meteringv1.GroupVersion.WithResource("meteringquotas")
	var meteringQuota meteringv1.MeteringQuota
	if err := baseapi.GetObject(namespace, name, gvr, &meteringQuota); err != nil {
		return nil, err
	}
	return &meteringQuota, nil
}

func DeleteMeteringQuota(namespace string, name string) error {
	_, err := baseapi.KubeDeleteFromTemplate(meteringQuotaYaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
	if err != nil {
		return err
	}
	return nil
}

func UpdateMeteringQuota() {
	panic(1)
}
