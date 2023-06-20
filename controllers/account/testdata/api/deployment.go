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
