package api

import (
	"fmt"
	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
	"time"
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
    image: "ami-0d66b970b9f16f1f5"
    disks:
    - capacity: 16
      volumeType: gp3
      # allowed value is root|data
      type: "root"

  - roles: [ node ] 
    count: 1 
    flavor: t2.medium
    image: "ami-0d66b970b9f16f1f5"
    disks:
    - capacity: 16
      volumeType: gp3
      # allowed value is root|data
      type: "root"
`

func GetInfra(namespace string, name string) (*infrav1.Infra, error) {
	gvr := infrav1.GroupVersion.WithResource("infras")
	var infra infrav1.Infra
	if err := baseapi.GetObject(namespace, name, gvr, &infra); err != nil {
		return nil, err
	}
	return &infra, nil
}

func EnsureInfra(namespace string, name string, times int) error {
	_, err := GetInfra(namespace, name)
	if err != nil {
		baseapi.CreateCRD(namespace, name, InfraYaml)
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
	return fmt.Errorf("infra time out")
}
