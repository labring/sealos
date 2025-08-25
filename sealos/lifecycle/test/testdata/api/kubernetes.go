// Copyright © 2022 sealos.
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
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"k8s.io/apimachinery/pkg/runtime"

	"gopkg.in/yaml.v3"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
)

const UserAnnotationOwnerKey = "user.sealos.io/creator"

// GetDefaultKubernetesClient returns a kubernetes client
func GetDefaultKubernetesClient() *kubernetes.Clientset {
	kubeconfig := GetDefaultKubeConfigPath()

	config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		panic(err.Error())
	}

	// create the client
	client, err := kubernetes.NewForConfig(config)
	if err != nil {
		panic(err.Error())
	}

	return client
}

func GetDefaultKubeConfigPath() string {
	// get the value of the environment variable KUBE_CONFIG_FILE
	kubeconfig := os.Getenv("KUBE_CONFIG_FILE")
	if kubeconfig == "" {
		// if KUBECONFIG is not set, use the default location
		kubeconfig = filepath.Join(homedir.HomeDir(), ".kube", "config")
	}

	return kubeconfig
}

func GetDefaultDynamicClient() dynamic.Interface {
	kubeconfig := GetDefaultKubeConfigPath()

	config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		panic(err.Error())
	}

	// create the client
	client, err := dynamic.NewForConfig(config)
	if err != nil {
		panic(err.Error())
	}

	return client
}

func GetNodeAddress() string {
	// get the address from env variable first: NODE_ADDRESS
	nodeAddress := os.Getenv("NODE_ADDRESS")
	if nodeAddress != "" {
		return nodeAddress
	}

	client := GetDefaultKubernetesClient()
	nodes, err := client.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		panic(err.Error())
	}
	return nodes.Items[0].Status.Addresses[0].Address
}

func CreateNamespace(client *kubernetes.Clientset, name string) *v1.Namespace {
	ns := &v1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
			Annotations: map[string]string{
				UserAnnotationOwnerKey: name[3:],
			},
		},
	}
	result, err := client.CoreV1().Namespaces().Create(context.TODO(), ns, metav1.CreateOptions{})
	if err != nil {
		panic(err.Error())
	}

	return result
}

func EnsureDeleteNamespace(name string, times int) error {
	client := GetDefaultKubernetesClient()
	_, err := client.CoreV1().Namespaces().Get(context.TODO(), name, metav1.GetOptions{})
	if err == nil {
		DeleteNamespace(name)
	}
	for i := 0; i < times; i++ {
		_, err := client.CoreV1().Namespaces().Get(context.TODO(), name, metav1.GetOptions{})
		if err != nil {
			break
		}
		time.Sleep(time.Second)
	}
	return nil
}

func GetObject(namespace string, name string, gvr schema.GroupVersionResource, out interface{}) error {
	client := GetDefaultDynamicClient()
	obj, err := client.Resource(gvr).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		return err
	}
	err = runtime.DefaultUnstructuredConverter.FromUnstructured(obj.Object, out)
	if err != nil {
		return err
	}
	return nil
}

func KubeUpdateStatus(name, namespace, statusYaml string, gvr schema.GroupVersionResource) error {
	client := GetDefaultDynamicClient()
	user, err := client.Resource(gvr).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		return err
	}
	status := make(map[string]interface{})
	err = yaml.Unmarshal([]byte(statusYaml), &status)
	if err != nil {
		return err
	}
	user.Object["status"] = status
	_, err = client.Resource(gvr).Namespace(namespace).UpdateStatus(context.TODO(), user, metav1.UpdateOptions{})
	if err != nil {
		return err
	}
	return nil
}

func Exec(command string) (string, error) {
	cmd := exec.Command("sh", "-c", command)
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()
	if err != nil {
		fmt.Println(fmt.Sprint(err) + ": " + stderr.String())
		return stderr.String(), err
	}
	return stdout.String(), nil
}

func KubeApplyFromTemplate(yaml string, params map[string]string) (string, error) {
	out := os.Expand(yaml, func(k string) string { return params[k] })
	return KubeApply(out)
}

func CreateCRD(namespace string, name string, yaml string) {
	MustKubeApplyFromTemplate(yaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
}

func MustKubeApplyFromTemplate(yaml string, params map[string]string) {
	_, err := KubeApplyFromTemplate(yaml, params)
	if err != nil {
		panic(err)
	}
}

func DeleteCRD(namespace string, name string, yaml string) error {
	_, err := KubeDeleteFromTemplate(yaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
	if err != nil {
		return err
	}
	return nil
}

func KubeDeleteFromTemplate(yaml string, params map[string]string) (string, error) {
	out := os.Expand(yaml, func(k string) string { return params[k] })
	return KubeDelete(out)
}

func MustKubeDeleteFromTemplate(yaml string, params map[string]string) {
	_, err := KubeDeleteFromTemplate(yaml, params)
	if err != nil {
		panic(err)
	}
}

func KubeApply(yaml string) (string, error) {
	cmd := `kubectl apply -f - <<EOF` + yaml + `EOF`
	out, err := Exec(cmd)
	if err != nil {
		return out, err
	}

	return out, nil
}

func MustKubeApply(yaml string) {
	_, err := KubeApply(yaml)
	if err != nil {
		panic(err)
	}
}

func KubeDelete(yaml string) (string, error) {
	cmd := `kubectl delete -f - <<EOF` + yaml + `EOF`
	out, err := Exec(cmd)
	if err != nil {
		return out, err
	}

	return out, nil
}

func MustKubeDelete(yaml string) {
	_, err := KubeDelete(yaml)
	if err != nil {
		panic(err)
	}
}

func KubeWaitForDeleted(namespace string, groupResourceName string, timeout string) (string, error) {
	cmd := fmt.Sprintf(`kubectl wait --for=delete --timeout=%s %s -n %s`, timeout, groupResourceName, namespace)
	out, err := Exec(cmd)
	if err != nil {
		return out, err
	}

	return out, nil
}

func MustKubeWaitForDeleted(namespace string, groupResourceName string, timeout string) {
	_, err := KubeWaitForDeleted(namespace, groupResourceName, timeout)
	if err != nil {
		panic(err.Error())
	}
}

func KubeWaitForCondition(namespace string, groupResourceName string, condition string, timeout string) (string, error) {
	cmd := fmt.Sprintf(`kubectl wait --for=condition=%s --timeout=%s %s -n %s`, condition, timeout, groupResourceName, namespace)
	out, err := Exec(cmd)
	if err != nil {
		return out, err
	}

	return out, nil
}

func MustKubeWaitForCondition(namespace string, groupResourceName string, condition string, timeout string) {
	_, err := KubeWaitForCondition(namespace, groupResourceName, condition, timeout)
	if err != nil {
		panic(err.Error())
	}
}

func KubeWaitForReady(namespace string, groupResourceName string, timeout string) (string, error) {
	out, err := KubeWaitForCondition(namespace, groupResourceName, "ready", timeout)
	if err != nil {
		return out, err
	}

	return out, nil
}

func MustKubeWaitForReady(namespace string, groupResourceName string, timeout string) {
	_, err := KubeWaitForReady(namespace, groupResourceName, timeout)
	if err != nil {
		panic(err.Error())
	}
}

func WaitForReady(fn func(args ...interface{}) bool, times int) error {
	for i := 1; i <= times; i++ {
		if fn() {
			return nil
		}
		time.Sleep(time.Second)
	}
	return errors.New("timeout")
}
