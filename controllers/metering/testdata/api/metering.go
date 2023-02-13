package api

import (
	"fmt"
	"time"

	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
)

const MeteringYaml = `
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

func EnsureMetering(namespace string, name string) {
	if _, err := GetMetering(namespace, name); err != nil {
		baseapi.CreateCRD(namespace, name, MeteringYaml)
	}
}

func EnsureMeteringCalculate(namespace string, name string, times int) (*meteringv1.Metering, error) {
	EnsureMetering(namespace, name)
	metering, _ := GetMetering(namespace, name)
	time.Sleep(time.Second)
	for i := 1; i <= times; i++ {
		metering, err := GetMetering(namespace, name)
		if err != nil {
			return nil, err
		}
		if metering.Status.TotalAmount > 0 {
			return metering, nil
		}
		time.Sleep(time.Second)
	}
	return metering, fmt.Errorf("metering calculate failed")
}

func DeleteMetering(namespace string, name string) error {
	_, err := baseapi.KubeDeleteFromTemplate(MeteringYaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
	if err != nil {
		return err
	}
	return nil
}

func EnsureMeteringUsed(namespace string, name string, times int) (*meteringv1.Metering, error) {
	EnsureMetering(namespace, name)
	time.Sleep(time.Second)
	for i := 1; i <= times; i++ {
		metering, err := GetMetering(namespace, name)
		if err != nil {
			time.Sleep(time.Second)
			continue
		}
		if _, ok := metering.Spec.Resources["cpu"]; !ok {
			return nil, fmt.Errorf("metering resource cpu is not found")
		}
		if metering.Spec.Resources["cpu"].Used.Value() > 0 {
			return metering, nil
		}
		time.Sleep(time.Second)
	}
	return nil, fmt.Errorf("metering calculate failed")
}
