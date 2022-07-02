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
	"github.com/labring/sealos/pkg/infra/aws"
	"testing"
	"time"

	"github.com/labring/sealos/pkg/infra/aliyun"
	"github.com/labring/sealos/pkg/infra/huawei"

	"sigs.k8s.io/yaml"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestAliApply(t *testing.T) {
	//setup infra
	infra := v2.Infra{
		TypeMeta: metav1.TypeMeta{
			Kind:       "Infra",
			APIVersion: v2.SchemeGroupVersion.String(),
		},
		ObjectMeta: metav1.ObjectMeta{
			Name: "my-infra",
		},
		Spec: v2.InfraSpec{
			Metadata: v2.InfraMetadata{
				RegionIDs: []string{"cn-shanghai"},
				ZoneIDs:   []string{"cn-shanghai-l"},
				AccessChannels: v2.InfraAccessChannels{
					SSH: v2.InfraSSH{
						Passwd: "Fanux#123",
						Port:   22,
					},
				},
				Instance: v2.InfraInstance{
					IsSeize: true,
				},
			},
			Hosts: []v2.InfraHost{
				{
					Roles:  []string{"master", "ssdxxx"},
					CPU:    2,
					Memory: 4,
					Count:  1,
					Disks:  []v2.InfraDisk{},
					OS: v2.InfraOS{
						ID: "centos_8_0_x64_20G_alibase_20210712.vhd",
					},
					EcsType: "ecs.c7a.large",
				},
			},
			Provider: aliyun.AliyunProvider,
		},
	}

	aliProvider, err := NewDefaultProvider(&infra)
	if err != nil {
		fmt.Printf("%v", err)
	} else {
		fmt.Printf("%v", aliProvider.Apply())
	}
	// todo
	t.Run("modify instance system disk", func(t *testing.T) {
		j, _ := yaml.Marshal(&infra)
		t.Log("output yaml:", string(j))
		infra.Spec.Hosts = []v2.InfraHost{
			{
				Roles:  []string{"master", "ssd"},
				CPU:    2,
				Memory: 4,
				Count:  1,
				Disks:  []v2.InfraDisk{},
				OS: v2.InfraOS{
					ID: "centos_8_0_x64_20G_alibase_20210712.vhd",
				},
				EcsType: "ecs.c7a.large",
			},
			{
				Roles:  []string{"master", "ssdxxx"},
				CPU:    2,
				Memory: 4,
				Count:  1,
				Disks:  []v2.InfraDisk{},
				OS: v2.InfraOS{
					ID: "centos_8_0_x64_20G_alibase_20210712.vhd",
				},
				EcsType: "ecs.c7a.large",
			},
		}
		t.Logf("add server:%v", aliProvider.Apply())
		j, _ = yaml.Marshal(&infra)
		t.Log("output yaml:", string(j))
		time.Sleep(10 * time.Second)
		infra.Spec.Hosts = []v2.InfraHost{
			{
				Roles:  []string{"master", "ssd"},
				CPU:    2,
				Memory: 4,
				Count:  1,
				Disks:  []v2.InfraDisk{},
				OS: v2.InfraOS{
					ID: "centos_8_0_x64_20G_alibase_20210712.vhd",
				},
				EcsType: "ecs.s6-c1m2.large",
			},
		}
		t.Logf("delete:%v", aliProvider.Apply())
		j, _ = yaml.Marshal(&infra)
		t.Log("output yaml:", string(j))
	})
	//teardown
	time.Sleep(20 * time.Second)
	now := metav1.Now()
	infra.ObjectMeta.DeletionTimestamp = &now
	t.Logf("%v", aliProvider.Apply())
}

func TestHuaweiApply(t *testing.T) {
	//setup infra
	infra := v2.Infra{
		TypeMeta: metav1.TypeMeta{
			Kind:       "Infra",
			APIVersion: v2.SchemeGroupVersion.String(),
		},
		ObjectMeta: metav1.ObjectMeta{
			Name: "my-infra",
		},
		Spec: v2.InfraSpec{
			Credential: v2.InfraCredential{ProjectID: "06b264130780105b2f50c0145ba32d41"},
			Metadata: v2.InfraMetadata{
				RegionIDs: []string{"cn-north-4"},
				ZoneIDs:   []string{""},
				AccessChannels: v2.InfraAccessChannels{
					SSH: v2.InfraSSH{
						Passwd: "Fanux#123",
						Port:   22,
					},
				},
				Instance: v2.InfraInstance{IsSeize: true},
			},
			Hosts: []v2.InfraHost{
				{
					Roles:  []string{"master", "ssdxxx"},
					CPU:    2,
					Memory: 4,
					Count:  1,
					Disks:  []v2.InfraDisk{},
					OS: v2.InfraOS{
						Name: "ubuntu",
					},
				},
			},
			Provider: huawei.HuaweiProvider,
		},
	}

	hwProvider, err := NewDefaultProvider(&infra)
	if err != nil {
		fmt.Printf("%v", err)
		return
	}
	fmt.Printf("%v", hwProvider.Apply())
	// todo
	t.Run("default", func(t *testing.T) {

	})
	//teardown
	time.Sleep(20 * time.Second)
	now := metav1.Now()
	infra.ObjectMeta.DeletionTimestamp = &now
	t.Logf("%v", hwProvider.Apply())
}

func TestAwsApply(t *testing.T) {
	infra := v2.Infra{
		Status: v2.InfraStatus{
			Cluster: v2.InfraClusterStatus{
				Annotations: map[string]string{
					"sealos.io/EgressGatewayID":  "eigw-0d1758beee0de19e1",
					"sealos.io/IngressGatewayID": "igw-075971d5ee49992b9",
					"sealos.io/KeyPairID":        "key-09101cbc7e7e31478",
					"sealos.io/SecurityGroupID":  "sg-031216262cbf278c5",
					"sealos.io/SubnetID":         "subnet-0a71f793d119bb69f",
					"sealos.io/SubnetZoneID":     "cnn1-az1",
					"sealos.io/VpcID":            "vpc-0f9fa01d0b4f0ae79",
				},
				RegionID: "cn-north-1",
				ZoneID:   "cnn1-az4",
			},
			Hosts: []v2.InfraHostStatus{
				{
					IDs:     "i-071ee0d2faf560f0c,i-0c90c94f67403645a",
					IPs:     []string{"192.168.14.182", "192.168.8.200"},
					Arch:    "arm64",
					ImageID: "ami-000407aa966970eae",
					Ready:   true,
					Roles:   []string{"master", "node"},
				},
				{
					IDs:     "i-06f85f8f1df21465d",
					IPs:     []string{"192.168.8.208"},
					Arch:    "arm64",
					ImageID: "ami-000407aa966970eae",
					Ready:   true,
					Roles:   []string{"node"},
				},
			},
		},
		TypeMeta: metav1.TypeMeta{
			Kind:       "Infra",
			APIVersion: v2.SchemeGroupVersion.String(),
		},
		ObjectMeta: metav1.ObjectMeta{
			Name: "my-aws-infra",
		},
		Spec: v2.InfraSpec{
			Metadata: v2.InfraMetadata{
				RegionIDs: []string{"cn-north-1"},
				ZoneIDs:   []string{},
				AccessChannels: v2.InfraAccessChannels{
					SSH: v2.InfraSSH{
						Passwd: "Fanux#123",
						Port:   22,
					},
				},
				Instance: v2.InfraInstance{
					IsSeize: true,
				},
			},
			Hosts: []v2.InfraHost{
				{
					Roles:  []string{"master", "node"},
					CPU:    2,
					Memory: 4,
					Count:  2,
					Arch:   v2.ARM64,
					Disks:  []v2.InfraDisk{},
				},
				{
					Roles:  []string{"node"},
					CPU:    4,
					Memory: 8,
					Count:  1,
					Arch:   v2.ARM64,
					Disks:  []v2.InfraDisk{},
				},
			},
			Provider: aws.AwsCloudProvider,
		},
	}

	provider, err := NewDefaultProvider(&infra)
	if err != nil {
		fmt.Printf("%v", err)
	} else {
		fmt.Printf("%v", provider.Apply())
	}
	j, _ := yaml.Marshal(&infra)
	t.Log("output yaml:", string(j))
	//// todo
	//t.Run("modify instance system disk", func(t *testing.T) {
	//	j, _ := yaml.Marshal(&infra)
	//	t.Log("output yaml:", string(j))
	//	infra.Spec.Hosts = []v2.InfraHost{
	//		{
	//			Roles:  []string{"master", "ssd"},
	//			CPU:    2,
	//			Memory: 4,
	//			Count:  1,
	//			Disks:  []v2.InfraDisk{},
	//		},
	//		{
	//			Roles:  []string{"master", "ssd"},
	//			CPU:    2,
	//			Memory: 4,
	//			Count:  1,
	//			Disks:  []v2.InfraDisk{},
	//		},
	//	}
	//	t.Logf("add server:%v", provider.Apply())
	//	j, _ = yaml.Marshal(&infra)
	//	t.Log("output yaml:", string(j))
	//	time.Sleep(10 * time.Second)
	//	infra.Spec.Hosts = []v2.InfraHost{
	//		{
	//			Roles:  []string{"master", "ssd"},
	//			CPU:    2,
	//			Memory: 4,
	//			Count:  1,
	//			Disks:  []v2.InfraDisk{},
	//		},
	//	}
	//	t.Logf("delete:%v", provider.Apply())
	//	j, _ = yaml.Marshal(&infra)
	//	t.Log("output yaml:", string(j))
	//})
	////teardown
	//time.Sleep(20 * time.Second)
	//now := metav1.Now()
	//infra.ObjectMeta.DeletionTimestamp = &now
	//t.Logf("%v", provider.Apply())
}
