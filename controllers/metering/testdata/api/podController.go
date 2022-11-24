package api

import (
	"context"

	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const podControllerYaml = `
---
apiVersion: metering.sealos.io/v1
kind: PodResourcePrice
metadata:
  name: ${name}
  namespace: ${namespace}
spec:
  owner: "pod controller"
  interval: 1
  resources:
    cpu:
      unit: "1"
      price: 1
      describe: "cost per cpu per hour（price:100 = 1¥）"

    memory:
      unit: "1G"
      price: 1
      describe: "the cost per gigabyte of memory per hour（price:100 = 1¥）"

    storage:
      unit: "1G"
      price:  1
      describe: "cost per gigabyte of storage per hour（price:100 = 1¥）"

    ephemeral-storage:
      unit: "1G"
      price: 1
      describe: "cost per gigabyte of storage per hour（price:100 = 1¥）"

`

func CreatePodController(namespace string, name string) {
	baseapi.MustKubeApplyFromTemplate(podControllerYaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
}

func DeletePodController(namespace string, name string) error {
	_, err := baseapi.KubeDeleteFromTemplate(podControllerYaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
	if err != nil {
		return err
	}
	return nil
}

func GetPodController(namespace string, name string) (*meteringv1.PodResourcePrice, error) {
	gvr := meteringv1.GroupVersion.WithResource("podresourceprices")
	var podController meteringv1.PodResourcePrice
	if err := baseapi.GetObject(namespace, name, gvr, &podController); err != nil {
		return nil, err
	}
	return &podController, nil
}
func EnsurePodController(namespace, name string) {
	if _, err := GetPodController(namespace, name); err != nil {
		CreatePodController(namespace, name)
		return
	}
}

const podYaml = `
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  namespace: ${namespace}
spec:
  containers:
    - name: nginx
      image: nginx:1.14.2
      resources:
        requests:
          cpu: 1000m
          memory: 1Gi
          ephemeral-storage: 1Gi

        limits:
          cpu: 1000m
          memory: 1Gi
          ephemeral-storage: 1Gi
      ports:
        - containerPort: 80
  volumes:
  - name: task-pv-storage
    persistentVolumeClaim:
      claimName: task-pv-claim

---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: task-pv-volume
  namespace: ${namespace}
  labels:
    type: local
spec:
  storageClassName: manual
  capacity:
    storage: 1Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: "/"
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: task-pv-claim
  namespace: ${namespace}
spec:
  storageClassName: manual
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
`

func CreatPod(namespace string, name string) {
	baseapi.MustKubeApplyFromTemplate(podYaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
}

func DeletePod(namespace string, name string) error {
	_, err := baseapi.KubeDeleteFromTemplate(podYaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
	if err != nil {
		return err
	}
	return nil
}

func EnsurePod(namespace string, name string) {
	client := baseapi.GetDefaultKubernetesClient()
	_, err := client.CoreV1().Pods(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		CreatPod(namespace, name)
		return
	}
}
