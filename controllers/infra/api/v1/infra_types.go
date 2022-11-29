/*
Copyright 2022 labring.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package v1

import (
	"fmt"

	v1bata1 "github.com/labring/sealos/pkg/types/v1beta1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/kustomize/kyaml/resid"
)

/*
apiVersion: infra.sealos.io/v1
kind: Infra
metadata:
  name: aws-infra-demo
  annotations:
    infra.sealos.io/VpcID: v-xxxxx
    infra.sealos.io/RouteID: v-xxxxx
    infra.sealos.io/IgwID: v-xxxxxx
    infra.sealos.io/EgwID: v-xxxxxx
    infra.sealos.io/SubnetID: v-xxxxx
    infra.sealos.io/SecurityGroupID: v-xxxxx
    infra.sealos.io/EIPID: v-xxxxx
spec:
    regionIds: [cn-hangzhou, cn-shanghai]
    zoneIds: [cn-hangzhou-a, cn-hangzhou-b]
    ssh:
       passwd: xxx
       pk: /root/.ssh/id_rsa
       port: 22
       user: root
   hosts:
   - roles: [master, aaa, bbb] # required
     metadata:
     - ips: [127.0.0.1, 1921.68.0.2]
       id: instanceID
     count: 3 # Required
     # key values resources.
     resources:
        cpu: 2
        memory: 4
        # other resources like GPU
     # ENUM: amd64/arm64 (NOTE: the default value is amd64)
     flavor: ecs.t5-lc1m2.large
     arch: amd64
     # ENUM: ubuntu:20.04, centos:7.2 and so on.
     image: utuntu:20.04
     disks:
     - capacity: 50
       # ENUM: system/data
       type: system
*/

var ec2p map[string]int64

// ebs unit: CNY cents/GB-month
var ebs map[string]int64

type IPAddress struct {
	IPType  string `json:"ipType,omitempty"`
	IPValue string `json:"ipValue,omitempty"`
}

type Metadata struct {
	// 0 private , 1 public
	IP     []IPAddress `json:"ipaddress,omitempty"`
	ID     string      `json:"id,omitempty"`
	DiskID []string    `json:"diskId,omitempty"`
	Status string      `json:"status,omitempty"`
}

type Hosts struct {
	Roles []string `json:"roles,omitempty"`
	Count int      `json:"count,omitempty"`
	// key values resources.
	// cpu: 2
	// memory: 4
	// other resources like GPU
	Resources map[string]resource.Quantity `json:"resources,omitempty"`
	// ecs.t5-lc1m2.large
	Flavor string `json:"flavor,omitempty"`
	// ENUM: amd64/arm64 (NOTE: the default value is amd64)
	Arch string `json:"arch,omitempty"`
	// ENUM: ubuntu:20.04, centos:7.2 and so on.
	Image    string     `json:"image,omitempty"`
	Disks    []Disk     `json:"disks,omitempty"`
	Metadata []Metadata `json:"metadata,omitempty"`
	// Find the mapping between expected hosts and actual hosts
	Index int `json:"index,omitempty"`
}

type IndexHosts []Hosts

func (hosts IndexHosts) Len() int {
	return len(hosts)
}

func (hosts IndexHosts) Less(i, j int) bool {
	return hosts[i].Index < hosts[j].Index
}

func (hosts IndexHosts) Swap(i, j int) {
	hosts[i], hosts[j] = hosts[j], hosts[i]
}

type Disk struct {
	Capacity int `json:"capacity,omitempty"`
	// ENUM: system/data
	Type string `json:"type,omitempty"`
	// Device name
	Name string `json:"name,omitempty"`
}

type NameDisks []Disk

func (disks NameDisks) Len() int {
	return len(disks)
}

func (disks NameDisks) Less(i, j int) bool {
	return disks[i].Name < disks[j].Name
}

func (disks NameDisks) Swap(i, j int) {
	disks[i], disks[j] = disks[j], disks[i]
}

// InfraSpec defines the desired state of Infra
type InfraSpec struct {
	// desired state of infra
	// Important: Run "make" to regenerate code after modifying this file

	// RegionIDs is cloud provider regionID list
	RegionIDs []string    `json:"regionIDs,omitempty"`
	ZoneIDs   []string    `json:"zoneIDs,omitempty"`
	SSH       v1bata1.SSH `json:"ssh,omitempty"`
	Hosts     []Hosts     `json:"hosts,omitempty"`
	// Availability Zone
	AvailabilityZone string `json:"availabilityZone,omitempty"`
}

// InfraStatus defines the observed state of Infra
type InfraStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
	Status string `json:"status,omitempty"`
}
type Status int

const (
	Pending Status = iota
	Running
	Succeeded
	Failed
	Unknown
)

func (s Status) String() string {
	switch s {
	case Pending:
		return "Pending"
	case Running:
		return "Running"
	case Succeeded:
		return "Succeeded"
	case Failed:
		return "Failed"
	default:
		return "Unknown"
	}
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// Infra is the Schema for the infras API
type Infra struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   InfraSpec   `json:"spec,omitempty"`
	Status InfraStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// InfraList contains a list of Infra
type InfraList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Infra `json:"items"`
}

func (i *Infra) GetInstancesAndVolumesTag() string {
	namespace := i.Namespace
	if namespace == "" {
		namespace = resid.DefaultNamespace
	}
	// TODO maybe we also needs a cluster identify
	return fmt.Sprintf("%s/%s", namespace, i.Name)
}

// QueryPrice query infra price/hour, unit: CNY cents/hour
func (i *Infra) QueryPrice() (int64, error) {
	valueEc2, valueEbs := int64(0), int64(0)
	for _, j := range i.Spec.Hosts {
		if _, ok := ec2p[j.Flavor]; !ok {
			return -1, fmt.Errorf("no ec2 type")
		}
		valueEc2 += ec2p[j.Flavor] * int64(j.Count)

		for _, disk := range j.Disks {
			if _, ok := ebs[disk.Type]; !ok {
				return -1, fmt.Errorf("no ebs type")
			}
			valueEbs += ebs[disk.Type] * int64(disk.Capacity) * int64(j.Count)
		}
	}
	valueEbs = valueEbs / 30 / 24
	return int64(1.25 * float64(valueEc2+valueEbs)), nil
}

func init() {
	ec2p = map[string]int64{
		"t2.micro":   int64(10),
		"t2.small":   int64(22),
		"t2.medium":  int64(43),
		"t2.large":   int64(86),
		"t2.xlarge":  int64(170),
		"t2.2xlarge": int64(340),
		"t3.medium":  int64(27),
		"t3.large":   int64(53),
		"t3.xlarge":  int64(106),
		"t3.2xlarge": int64(211),
		"t4g.medium": int64(21),
		"c5.large":   int64(74),
		"c5.xlarge":  int64(148),
		"c5.2xlarge": int64(296),
		"c6g.large":  int64(59),
		"c6g.xlarge": int64(118),
	}
	ebs = map[string]int64{
		"gp2": int64(75),
		"gp3": int64(60),
	}
	SchemeBuilder.Register(&Infra{}, &InfraList{})
}
