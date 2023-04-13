package api

import (
	"fmt"
	"time"

	meteringcommonv1 "github.com/labring/sealos/controllers/common/metering/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
)

const ResourceYaml = `
apiVersion: infra.sealos.io/v1
kind: InfraResource
metadata:
  name: ${name}
  namespace: ${namespace}
spec:
  resourceName: infra
  interval: 60
  resources:
    infra/CPU:
      unit: "1"
      price: 12
      describe: "cost of per cpu per hour"

    infra/Memory:
      unit: "1G"
      price: 6
      describe: "cost of per memory per hour"

    infra/Volume:
      unit: "100G"
      price: 35
      describe: "cost of per 1G volume per hour"
`

func GetResource(namespace string, name string) (*meteringcommonv1.Resource, error) {
	gvr := meteringcommonv1.GroupVersion.WithResource("resources")
	var resource meteringcommonv1.Resource
	if err := baseapi.GetObject(namespace, name, gvr, &resource); err != nil {
		return nil, err
	}
	return &resource, nil
}

func SyncResource(namespace string, name string) error {
	_, err := baseapi.KubeApplyFromTemplate(ResourceYaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
	if err != nil {
		return err
	}
	return nil
}

func EnsureResourceCreate(namespace string, name string, times int) (*meteringcommonv1.Resource, error) {
	time.Sleep(time.Second)
	for i := 1; i <= times; i++ {
		resource, err := GetResource(namespace, name)
		if err != nil {
			time.Sleep(time.Second)
			continue
		}
		return resource, nil
	}
	return nil, fmt.Errorf("resource create failed")
}

func DeleteResource(namespace string, name string) error {
	_, err := baseapi.KubeDeleteFromTemplate(ResourceYaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
	if err != nil {
		return err
	}
	return nil
}
