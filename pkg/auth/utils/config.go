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

package utils

import (
	"context"
	"fmt"
	"time"

	"k8s.io/apimachinery/pkg/labels"

	"github.com/jaevor/go-nanoid"
	"k8s.io/apimachinery/pkg/watch"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"github.com/labring/sealos/pkg/auth/conf"
	"github.com/labring/sealos/pkg/client-go/kubernetes"
)

const (
	LetterBytes    = "abcdefghijklmnopqrstuvwxyz0123456789"
	HostnameLength = 8
)

func CreateOrUpdateKubeConfig(uid string) error {
	if conf.GlobalConfig.MockK8s {
		return nil
	}
	client, err := kubernetes.NewKubernetesClient(conf.GlobalConfig.Kubeconfig, "")
	if err != nil {
		return err
	}

	resource := client.KubernetesDynamic().Resource(schema.GroupVersionResource{
		Group:    "user.sealos.io",
		Version:  "v1",
		Resource: "users",
	})
	labelSelector, _ := labels.Parse("uid=" + uid)
	users, err := resource.List(context.Background(), metav1.ListOptions{LabelSelector: labelSelector.String()})
	if err != nil {
		return err
	}
	// It is illegal for one user to have multiple CR
	if len(users.Items) > 1 {
		return fmt.Errorf("one user has multiple CR")
	}
	if len(users.Items) == 0 {
		letterID, err := nanoid.CustomASCII(LetterBytes, HostnameLength)
		if err != nil {
			return err
		}
		_, err = resource.Create(context.TODO(), &unstructured.Unstructured{Object: map[string]interface{}{
			"apiVersion": "user.sealos.io/v1",
			"kind":       "User",
			"metadata": map[string]interface{}{
				"name": letterID(),
				"labels": map[string]interface{}{
					"uid":        uid,
					"updateTime": time.Now().Format("T2006-01-02T15-04-05"),
				},
			},
		}}, metav1.CreateOptions{})
		if err != nil {
			return err
		}
	} else {
		// To trigger controller reconcile
		for _, user := range users.Items {
			userLabels := user.GetLabels()
			userLabels["updateTime"] = time.Now().Format("T2006-01-02T15-04-05")
			user.SetLabels(userLabels)
			_, err = resource.Update(context.Background(), &user, metav1.UpdateOptions{})
			if err != nil {
				return err
			}
		}
	}
	return nil
}

func GetKubeConfig(uid string, timeout int) (string, error) {
	if conf.GlobalConfig.MockK8s {
		return "This is mock data.", nil
	}
	client, err := kubernetes.NewKubernetesClient(conf.GlobalConfig.Kubeconfig, "")
	if err != nil {
		return "", err
	}

	resource := client.KubernetesDynamic().Resource(schema.GroupVersionResource{
		Group:    "user.sealos.io",
		Version:  "v1",
		Resource: "users",
	})
	labelSelector, _ := labels.Parse("uid=" + uid)
	w, err := resource.Watch(context.Background(), metav1.ListOptions{
		LabelSelector: labelSelector.String(),
	})
	if err != nil {
		return "", err
	}

	for {
		select {
		case <-time.After(time.Duration(timeout) * time.Second):
			return "", fmt.Errorf("status is empty, please wait for a while or check the health of user-controller")
		case event := <-w.ResultChan():
			if event.Type == watch.Modified || event.Type == watch.Added {
				status := event.Object.(*unstructured.Unstructured).Object["status"]
				if status != nil {
					if kubeConfig, ok := status.(map[string]interface{})["kubeConfig"]; ok {
						return kubeConfig.(string), nil
					}
				}
			}
		}
	}
}
