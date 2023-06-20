package api

import (
	"fmt"
	"time"

	meteringcommonv1 "github.com/labring/sealos/controllers/common/metering/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
)

const ResourceYaml = `
apiVersion: metering.common.sealos.io/v1
kind: Resource
metadata:
  name: ${name}
  namespace: ${namespace}
spec:
  resources:
    resourceName: "cpu"
    Used: 1
`

func GetResource(namespace string, name string) (*meteringcommonv1.Resource, error) {
	gvr := meteringcommonv1.GroupVersion.WithResource("resources")
	var resource meteringcommonv1.Resource
	if err := baseapi.GetObject(namespace, name, gvr, &resource); err != nil {
		return nil, err
	}
	return &resource, nil
}

func EnsureResourceCreate(namespace string, name string, times int) (*meteringcommonv1.Resource, error) {
	time.Sleep(time.Second)
	for i := 1; i <= times; i++ {
		resource, err := GetResource(namespace, name)
		if err != nil {
			time.Sleep(time.Second)
			continue
		}
		if _, ok := resource.Spec.Resources["cpu"]; !ok {
			return nil, fmt.Errorf("not fount cpu resource used ")
		}
		if resource.Spec.Resources["cpu"].Used.Value() > 0 {
			return resource, nil
		}
		time.Sleep(time.Second)
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
