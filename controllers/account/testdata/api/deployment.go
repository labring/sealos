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
	baseapi "github.com/labring/sealos/test/testdata/api"
	apps "k8s.io/api/apps/v1"
)

const DeploymentYaml = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}
  namespace: ${namespace}
spec:
  selector:
    matchLabels:
      app: nginx
  replicas: 1 # 告知 Deployment 运行 2 个与该模板匹配的 Pod
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.14.2
        ports:
        - containerPort: 80
`

func GetDeployment(namespace, name string) (*apps.Deployment, error) {
	gvr := apps.SchemeGroupVersion.WithResource("deployments")
	var deployment apps.Deployment
	if err := baseapi.GetObject(namespace, name, gvr, &deployment); err != nil {
		return nil, err
	}
	return &deployment, nil
}
