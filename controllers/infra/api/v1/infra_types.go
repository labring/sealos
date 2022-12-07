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

var ec2NorthPrice map[string]float64

// ebs unit: CNY cents/GB-month
var ebs map[string]float64

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
	// +kubebuilder:validation:Required
	Roles []string `json:"roles,omitempty"`

	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Minimum:=0
	Count int `json:"count,omitempty"`
	// key values resources.
	// cpu: 2
	// memory: 4
	// other resources like GPU
	Resources map[string]resource.Quantity `json:"resources,omitempty"`
	// ecs.t5-lc1m2.large
	Flavor string `json:"flavor,omitempty"`
	// ENUM: amd64/arm64 (NOTE: the default value is amd64)
	// +kubebuilder:default:=amd64
	// +kubebuilder:validation:Enum=amd64;arm64
	Arch string `json:"arch,omitempty"`
	// ENUM: ubuntu:20.04, centos:7.2 and so on.
	Image string `json:"image,omitempty"`

	// max support 10 disks .
	// +kubebuilder:validation:MaxItems:=10
	// +kubebuilder:validation:Optional
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
	// ENUM: standard/io1/io2/gp2/gp3/sc1/st1
	// +kubebuilder:validation:Enum=standard;io1;io2;gp2;gp3;sc1;st1
	VolumeType string `json:"volumeType,omitempty"`
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Enum=root;data
	// +kubebuilder:default:=data
	// Disk Type , default is data disk. allowed value is `root|data`
	Type string `json:"type,omitempty"`
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
	// +kubebuilder:validation:Required
	Hosts []Hosts `json:"hosts,omitempty"`
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
	Terminating
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

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Status",type="string",JSONPath=".status.status",description="Status of Infra in group"
// +kubebuilder:printcolumn:name="Age",type="date",JSONPath=".metadata.creationTimestamp"
// +kubebuilder:printcolumn:name="AZ",type="string",JSONPath=".spec.availabilityZone"

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
	valueEc2, valueEbs := float64(0), float64(0)
	for _, j := range i.Spec.Hosts {
		if _, ok := ec2NorthPrice[j.Flavor]; !ok {
			return -1, fmt.Errorf("no ec2 type")
		}
		valueEc2 += ec2NorthPrice[j.Flavor] * float64(j.Count)

		for _, disk := range j.Disks {
			if _, ok := ebs[disk.Type]; !ok {
				return -1, fmt.Errorf("no ebs type")
			}
			valueEbs += ebs[disk.Type] * float64(disk.Capacity) * float64(j.Count)
		}
	}
	valueEbs = valueEbs / 30 / 24
	return int64(valueEc2 + valueEbs), nil
}

func init() {
	//the ec2 price is in cn-north-1
	ec2NorthPrice = map[string]float64{
		"t2.micro":   10.6,
		"t2.small":   21.3,
		"t2.medium":  42.6,
		"t2.large":   85.1,
		"t2.xlarge":  169.6,
		"t2.2xlarge": 340.4,
		"t3.medium":  26.29,
		"t3.large":   52.6,
		"t3.xlarge":  105.15,
		"t3.2xlarge": 210.3,
		"t4g.medium": 20.3,
		"c5.large":   73.9,
		"c5.xlarge":  147.9,
		"c5.2xlarge": 295.7,
		"c6g.large":  58.6,
		"c6g.xlarge": 117.2,
	}
	ebs = map[string]float64{
		"gp2": 74.6,
		"gp3": 59.68,
	}
	SchemeBuilder.Register(&Infra{}, &InfraList{})
}
