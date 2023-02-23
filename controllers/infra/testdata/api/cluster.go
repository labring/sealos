package api

import (
	"fmt"
	"time"

	clusterv1 "github.com/labring/sealos/controllers/cluster/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
)

const ClusterYaml = `
apiVersion: cluster.sealos.io/v1
kind: Cluster
metadata:
  name: ${name}
  namespace: ${namespace}
  annotations:
    sealos.io/version: "4.1.5-alpha2"
spec:
  infra: ${name}
  image:
    - labring/kubernetes:v1.25.5
    - labring/calico:v3.24.1
`

func CreateCluster(namespace string, name string) error {
	_, err := baseapi.KubeApplyFromTemplate(ClusterYaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
	if err != nil {
		return err
	}
	return nil
}

func DeleteCluster(namespace string, name string) error {
	_, err := baseapi.KubeDeleteFromTemplate(ClusterYaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
	if err != nil {
		return err
	}
	return nil
}

func GetCluster(namespace string, name string) (*clusterv1.Cluster, error) {
	gvr := clusterv1.GroupVersion.WithResource("clusters")
	var cluster clusterv1.Cluster
	if err := baseapi.GetObject(namespace, name, gvr, &cluster); err != nil {
		return nil, err
	}
	return &cluster, nil
}

func WaitClusterRunning(namespace string, name string, times int) error {
	_, err := GetCluster(namespace, name)
	if err != nil {
		return err
	}

	for i := 0; i < times; i++ {
		cluster, err := GetCluster(namespace, name)
		if err != nil {
			continue
		}
		if cluster.Status.Status == clusterv1.Running.String() {
			return nil
		}
		time.Sleep(time.Minute)
	}
	return fmt.Errorf("more than %v retries. Cluster failed to run", times)
}
