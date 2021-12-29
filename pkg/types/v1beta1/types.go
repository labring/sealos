// Copyright © 2021 sealos.
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

package v1beta1

import (
	"encoding/json"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

type Provider string

type Arch string

const (
	AMD64 Arch = "amd64"
	ARM64 Arch = "arm64"
)

type SSH struct {
	Passwd string `json:"passwd,omitempty"`
	Port   int32  `json:"port"`
}

type Host struct {
	Roles   []string `json:"roles,omitempty"`
	CPU     int      `json:"cpu,omitempty"`
	Memory  int      `json:"memory,omitempty"`
	Count   int      `json:"count"`
	Disks   []Disk   `json:"disks"`
	Arch    Arch     `json:"arch,omitempty"`
	EcsType string   `json:"ecsType,omitempty"`
	OS      OS       `json:"os,omitempty"`
}

func (h Host) ToRole() HostRole {
	if IsMaster(h.Roles) {
		return Master
	}
	return Node
}

func (h Host) String() string {
	data, _ := json.Marshal(&h)
	return string(data)
}

type OS struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	ID      string `json:"id,omitempty"`
}

type Disk struct {
	Capacity int `json:"capacity"`
	//MountPoint string `json:"mountPoint,omitempty"`
	Category string `json:"category"`
}

type Credential struct {
	AccessKey    string `json:"accessKey"`
	AccessSecret string `json:"accessSecret"`
	ProjectID    string `json:"ProjectID,omitempty"`
}

type AccessChannels struct {
	SSH SSH `json:"ssh,omitempty"`
}

type ClusterMeta struct {
	IsSeize bool `json:"isSeize,omitempty"`

	Network ClusterNetworkMeta `json:"network"`
}

type ClusterNetworkMeta struct {
	Bandwidth     string       `json:"bandwidth"`
	ExportPorts   []ExportPort `json:"exportPorts,omitempty"`
	PrivateCidrIP string       `json:"privateCidrIP,omitempty"`
}

type Protocol string

const (
	ProtocolTCP Protocol = "tcp"
	ProtocolUDP Protocol = "udp"
)

type ExportPort struct {
	Protocol  Protocol `json:"protocol"`
	CidrIP    string   `json:"cidrIP"`
	PortRange string   `json:"portRange"`
}

type Cluster struct {
	RegionIDs      []string          `json:"regionIDs,omitempty"`
	ZoneIDs        []string          `json:"zoneIDs,omitempty"`
	Annotations    map[string]string `json:"annotations,omitempty"`
	AccessChannels AccessChannels    `json:"accessChannels"`
	Metadata       ClusterMeta       `json:"metadata,omitempty"`
}

// InfraSpec defines the desired state of Infra
type InfraSpec struct {
	// Foo is an example field of Infra. Edit types.go to remove/update
	Provider   Provider   `json:"provider,omitempty"`
	Credential Credential `json:"credential,omitempty"`

	Cluster Cluster `json:"cluster,omitempty"`
	Hosts   []Host  `json:"hosts,omitempty"`
}

type ClusterStatus struct {
	RegionID          string            `json:"regionID,omitempty"`
	ZoneID            string            `json:"zoneID,omitempty"`
	SpotStrategy      string            `json:"spotStrategy,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
	EIP               string            `json:"eip,omitempty"`
	Master0ID         string            `json:"master0ID,omitempty"`
	Master0InternalIP string            `json:"master0InternalIP,omitempty"`
}
type HostStatus struct {
	Ready          bool     `json:"ready"`
	Roles          []string `json:"roles"`
	IDs            string   `json:"IDs,omitempty"`
	IPs            []string `json:"IPs,omitempty"`
	InstanceType   string   `json:"instanceType,omitempty"`
	SystemCategory string   `json:"systemCategory"`
	DataCategory   string   `json:"dataCategory,omitempty"`
	Arch           Arch     `json:"arch,omitempty"`
	ImageID        string   `json:"imageID,omitempty"`
}

// InfraStatus defines the observed state of Infra
type InfraStatus struct {
	Cluster ClusterStatus `json:"cluster"`
	Hosts   []HostStatus  `json:"hosts"`
}

func (hs HostStatus) ToHost() *Host {
	return &Host{
		Roles: hs.Roles,
		Arch:  hs.Arch,
	}
}

func (s InfraStatus) FindHostsByRoles(roles []string) int {
	for i, h := range s.Hosts {
		if strings.Join(h.Roles, ",") == strings.Join(roles, ",") {
			return i
		}
	}
	return -1
}

func (s InfraStatus) FindHostsByRolesString(roles string) int {
	for i, h := range s.Hosts {
		if strings.Join(h.Roles, ",") == roles {
			return i
		}
	}
	return -1
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// Infra is the Schema for the Infras API
type Infra struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   InfraSpec   `json:"spec,omitempty"`
	Status InfraStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// InfraList contains a list of Infra
type InfraList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Infra `json:"items"`
}
