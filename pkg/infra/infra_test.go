// Copyright © 2021 Alibaba Group Holding Ltd.
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

package infra

import (
	"fmt"
	"os"
	"testing"
	"time"

	"sigs.k8s.io/yaml"

	v2 "github.com/fanux/sealos/pkg/types/v1beta1"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestApply(t *testing.T) {
	//setup infra
	password := os.Getenv("SealosPassword")
	infra := v2.Infra{
		TypeMeta: metav1.TypeMeta{
			Kind:       "Infra",
			APIVersion: v2.SchemeGroupVersion.String(),
		},
		ObjectMeta: metav1.ObjectMeta{
			Name: "my-infra",
		},
		Spec: v2.InfraSpec{
			Instance: v2.Instance{
				IsSeize: true,
				Type:    "ecs.c6r.large",
			},
			Platform: v2.ARM64,
			Masters: v2.Hosts{
				Count:  1,
				CPU:    2,
				Memory: 4,
				Disks: v2.Disks{
					System: "100",
					Data:   []string{"100"},
				},
			},
			Nodes: &v2.Hosts{
				Count:  1,
				CPU:    2,
				Memory: 4,
				Disks: v2.Disks{
					System: "100",
					Data:   []string{"100"},
				},
			},
			Provider: v2.AliyunProvider,
			Auth: v2.Auth{
				Passwd: password,
			},
		},
	}

	aliProvider, err := NewDefaultProvider(&infra)
	if err != nil {
		fmt.Printf("%v", err)
	} else {
		fmt.Printf("%v", aliProvider.Apply())
	}

	t.Run("modify instance type", func(t *testing.T) {
		infra.Spec.Masters.CPU = 4
		infra.Spec.Masters.Memory = 8
		infra.Spec.Nodes.CPU = 4
		infra.Spec.Nodes.Memory = 8
		fmt.Printf("%v", aliProvider.Apply())
	})

	t.Run("add instance count", func(t *testing.T) {
		infra.Spec.Masters.Count = 5
		infra.Spec.Nodes.Count = 5
		fmt.Printf("%v", aliProvider.Apply())
		fmt.Printf("%v \n", infra.Spec.Masters)
		fmt.Printf("%v \n", infra.Spec.Nodes)
	})

	t.Run("reduce instance count", func(t *testing.T) {
		infra.Spec.Masters.Count = 1
		infra.Spec.Nodes.Count = 1
		fmt.Printf("%v", aliProvider.Apply())
	})

	t.Run("modify instance type & count both", func(t *testing.T) {
		infra.Spec.Masters.CPU = 8
		infra.Spec.Masters.Memory = 16
		infra.Spec.Nodes.CPU = 8
		infra.Spec.Nodes.Memory = 16
		infra.Spec.Masters.Count = 5
		infra.Spec.Nodes.Count = 5
		fmt.Printf("%v", aliProvider.Apply())
	})

	// todo
	t.Run("modify instance system disk", func(t *testing.T) {

	})

	j, _ := yaml.Marshal(&infra)
	t.Log("output yaml:", string(j))
	//teardown
	time.Sleep(20 * time.Second)
	now := metav1.Now()
	infra.ObjectMeta.DeletionTimestamp = &now
	t.Log(fmt.Sprintf("%v", aliProvider.Apply()))
}
