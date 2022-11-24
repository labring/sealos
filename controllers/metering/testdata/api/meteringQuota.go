package api

import (
	"fmt"
	"time"

	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
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

func EnsureMeteringQuota(namespace string, name string) {
	if _, err := GetMeteringQuota(namespace, name); err != nil {
		baseapi.CreateCRD(namespace, name, meteringQuotaYaml)
	}
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

func EnsureMeteringQuotaUsed(namespace string, name string, times int) (*meteringv1.MeteringQuota, error) {
	EnsureMeteringQuota(namespace, name)
	time.Sleep(time.Second)
	for i := 1; i <= times; i++ {
		meteringQuota, _ := GetMeteringQuota(namespace, name)
		if meteringQuota.Spec.Resources["cpu"].Used.Value() > 0 {
			return meteringQuota, nil
		}
		time.Sleep(time.Second)
	}
	return nil, fmt.Errorf("metering calculate failed")
}
