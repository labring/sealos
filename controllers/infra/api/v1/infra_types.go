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

	"github.com/labring/sealos/pkg/types/v1beta1"
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

type Metadata struct {
	IP []string `json:"ips,omitempty"`
	ID string   `json:"id,omitempty"`
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
}

type Disk struct {
	Capacity string `json:"capacity,omitempty"`
	// ENUM: system/data
	Type string `json:"type,omitempty"`
}

// InfraSpec defines the desired state of Infra
type InfraSpec struct {
	// desired state of infra
	// Important: Run "make" to regenerate code after modifying this file

	// RegionIDs is cloud provider regionID list
	RegionIDs []string    `json:"regionIDs,omitempty"`
	ZoneIDs   []string    `json:"zoneIDs,omitempty"`
	SSH       v1beta1.SSH `json:"ssh,omitempty"`
	Hosts     []Hosts     `json:"hosts,omitempty"`
}

// InfraStatus defines the observed state of Infra
type InfraStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
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

func (i *Infra) GetInstancesTag() string {
	namespace := i.Namespace
	if namespace == "" {
		namespace = resid.DefaultNamespace
	}
	// TODO maybe we also needs a cluster identify
	return fmt.Sprintf("%s/%s", namespace, i.Name)
}

func init() {
	SchemeBuilder.Register(&Infra{}, &InfraList{})
}
