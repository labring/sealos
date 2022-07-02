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
					"sealos.io/EgressGatewayID":  "eigw-048bfa29dc7969542",
					"sealos.io/IngressGatewayID": "igw-0130c9cf0bd52faed",
					"sealos.io/KeyPairID":        "key-0c5d4cb9bc5559645",
					"sealos.io/KeyPairPath":      "/Users/taozhang/.sealos.pk",
					"sealos.io/SecurityGroupID":  "sg-027fb931303595930",
					"sealos.io/SubnetID":         "subnet-024ff5dbba53f337c",
					"sealos.io/SubnetZoneID":     "cnn1-az1",
					"sealos.io/VpcID":            "vpc-0586e06bd415a4a23",
				},
				RegionID: "cn-north-1",
				ZoneID:   "cnn1-az4",
			},
			Hosts: []v2.InfraHostStatus{
				{
					IDs:     "i-0e1c30d48932b4806,i-095ffb793fe6f9e7f",
					IPs:     []string{"192.168.0.235", "192.168.9.21"},
					Arch:    "arm64",
					ImageID: "ami-000407aa966970eae",
					Ready:   true,
					Roles:   []string{"master"},
				},
				{
					IDs:     "i-05417021af4e2b47e,i-04592a3ebbf53e987,i-0974e092f00c325e9",
					IPs:     []string{"192.168.12.232", "192.168.14.99", "192.168.5.101"},
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
					Roles:  []string{"master"},
					CPU:    2,
					Memory: 4,
					Count:  2,
					Arch:   v2.ARM64,
				},
				{
					Roles:  []string{"node"},
					CPU:    4,
					Memory: 8,
					Count:  3,
					Arch:   v2.ARM64,
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
