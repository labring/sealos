package api

import (
	"fmt"
	"time"

	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
)

const InfraYaml = `
apiVersion: infra.sealos.io/v1
kind: Infra
metadata:
  name: ${name}
  namespace: ${namespace}
spec:
  hosts:
  - roles: [master] 
    count: 1
    flavor: t2.medium
    image: "ami-048280a00d5085dd1"
    disks:
    - capacity: 16
      volumeType: gp3
      # allowed value is root|data
      type: "root"

  - roles: [ node ] 
    count: 1 
    flavor: t2.medium
    image: "ami-048280a00d5085dd1"
    disks:
    - capacity: 16
      volumeType: gp3
      # allowed value is root|data
      type: "root"
`

func CreateInfra(namespace string, name string) error {
	_, err := baseapi.KubeApplyFromTemplate(InfraYaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
	if err != nil {
		return err
	}
	return nil
}

func DeleteInfra(namespace string, name string) error {
	_, err := baseapi.KubeDeleteFromTemplate(InfraYaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
	if err != nil {
		return err
	}
	return nil
}

func GetInfra(namespace string, name string) (*infrav1.Infra, error) {
	gvr := infrav1.GroupVersion.WithResource("infras")
	var infra infrav1.Infra
	if err := baseapi.GetObject(namespace, name, gvr, &infra); err != nil {
		return nil, err
	}
	return &infra, nil
}

func WaitInfraRunning(namespace string, name string, times int) error {
	_, err := GetInfra(namespace, name)
	if err != nil {
		return err
	}

	for i := 0; i < times; i++ {
		infra, err := GetInfra(namespace, name)
		if err != nil {
			continue
		}
		if infra.Status.Status == infrav1.Running.String() {
			return nil
		}
		time.Sleep(time.Second)
	}
	return fmt.Errorf("more than %v retries. Infra failed to run", times)
}
