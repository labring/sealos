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

package main

import (
	"context"
	"flag"

	"github.com/labring/sealos/pkg/client-go/kubernetes"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"fmt"
)

var configPath string

func main() {
	flag.StringVar(&configPath, "config", "", "Path of kube config")
	flag.Parse()

	client, err := kubernetes.NewKubernetesClient(configPath, "")
	if err != nil {
		panic(err.Error())
	}
	resource := client.KubernetesDynamic().Resource(schema.GroupVersionResource{
		Group:    "user.sealos.io",
		Version:  "v1",
		Resource: "users",
	})
	users, err := resource.List(context.Background(), metav1.ListOptions{})
	if err != nil {
		panic(err.Error())
	}
	for _, user := range users.Items {
		userLabels := user.GetLabels()
		if _, ok := userLabels["uid"]; !ok {
			userLabels["uid"] = user.GetName()
			user.SetLabels(userLabels)
			_, err = resource.Update(context.Background(), &user, metav1.UpdateOptions{})
			if err != nil {
				panic(err.Error())
			}
			fmt.Printf("Update user %v successfully\n", user.GetName())
		}
	}
}
