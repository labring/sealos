// Copyright © 2023 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package api

import (
	"fmt"
	"time"

	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
)

const InfraYaml_AWS = `
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

const InfraYaml_Aliyun = `
apiVersion: infra.sealos.io/v1
kind: Infra
metadata:
  name: ${name}
  namespace: ${namespace}
spec:
  platform: aliyun
  hosts:
    - roles: [ master ]
      count: 1
      flavor: ecs.c7.large
      image: "centos_7_9_x64_20G_alibase_20230109.vhd"
      disks:
        - capacity: 20
          volumeType: "cloud_essd"
          type: "root"
    - roles: [ node ]
      count: 1
      flavor: ecs.c7.large
      image: "centos_7_9_x64_20G_alibase_20230109.vhd"
      disks:
        - capacity: 20
          volumeType: "cloud_essd"
          type: "root"
`

func CreateInfra(namespace string, name string) error {
	_, err := baseapi.KubeApplyFromTemplate(InfraYaml_Aliyun, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
	if err != nil {
		return err
	}
	return nil
}

func DeleteInfra(namespace string, name string) error {
	_, err := baseapi.KubeDeleteFromTemplate(InfraYaml_Aliyun, map[string]string{
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
		if infra.Status.Status == infrav1.Failed.String() {
			return fmt.Errorf("infra %s is failed", name)
		}
		time.Sleep(time.Second)
	}
	return fmt.Errorf("more than %v retries. Infra failed to run", times)
}
