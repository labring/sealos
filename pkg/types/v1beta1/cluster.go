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

package v1beta1

import (
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/yaml"
)

// +kubebuilder:object:root=true
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// Cluster is the Schema for the InfraMetadata API
type Cluster struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ClusterSpec   `json:"spec,omitempty"`
	Status ClusterStatus `json:"status,omitempty"`
}

func (c *Cluster) String() string {
	data, _ := yaml.Marshal(c)
	return string(data)
}

type RegistryConfig struct {
	IP       string `json:"ip,omitempty"`
	Domain   string `json:"domain,omitempty"`
	Port     string `json:"port,omitempty"`
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`
	Data     string `json:"data,omitempty"`
}
type ImageType string

const (
	AppImage                  ImageType = "application"
	RootfsImage               ImageType = "rootfs"
	PatchImage                ImageType = "patch"
	ImageKubeVersionKey                 = "version"
	ImageVIPKey                         = "vip"
	ImageKubeLvscareImageKey            = "image"
	ImageTypeKey                        = "sealos.io.type"
	ImageKubeVersionEnvSysKey           = "SEALOS_SYS_KUBE_VERSION"
)

type MountImage struct {
	Name       string            `json:"name"`
	Type       ImageType         `json:"type"`
	ImageName  string            `json:"imageName"`
	MountPoint string            `json:"mountPoint"`
	Env        map[string]string `json:"env,omitempty"`
	Labels     map[string]string `json:"labels,omitempty"`
	Cmd        []string          `json:"cmd,omitempty"`
	Entrypoint []string          `json:"entrypoint,omitempty"`
}

type ClusterPhase string

const (
	ClusterFailed    ClusterPhase = "ClusterFailed"
	ClusterSuccess   ClusterPhase = "ClusterSuccess"
	ClusterInProcess ClusterPhase = "ClusterInProcess"
)

const (
	ClusterConditionTypeSuccess string = "ApplyClusterSuccess"
	ClusterConditionTypeError   string = "ApplyClusterError"

	CommandConditionTypeSuccess   string = "ApplyCommandSuccess"
	CommandConditionTypeError     string = "ApplyCommandError"
	CommandConditionTypeCancelled string = "ApplyCommandCancelled"
)

// ClusterCondition describes the state of a cluster at a certain point.
type ClusterCondition struct {
	Type              string             `json:"type"`
	Status            v1.ConditionStatus `json:"status"`
	LastHeartbeatTime metav1.Time        `json:"lastHeartbeatTime,omitempty"`
	// +optional
	Reason string `json:"reason,omitempty"`
	// +optional
	Message string `json:"message,omitempty"`
}

func NewSuccessClusterCondition() ClusterCondition {
	return ClusterCondition{
		Type:              ClusterConditionTypeSuccess,
		Status:            v1.ConditionTrue,
		LastHeartbeatTime: metav1.Now(),
		Reason:            "Ready",
		Message:           "Applied to cluster successfully",
	}
}

func NewFailedClusterCondition(message string) ClusterCondition {
	return ClusterCondition{
		Type:              ClusterConditionTypeError,
		Status:            v1.ConditionFalse,
		LastHeartbeatTime: metav1.Now(),
		Reason:            "Apply Cluster",
		Message:           message,
	}
}

type CommandCondition struct {
	Type              string             `json:"type"`
	Status            v1.ConditionStatus `json:"status"`
	LastHeartbeatTime metav1.Time        `json:"lastHeartbeatTime,omitempty"`

	// +optional
	Images []string `json:"images"`
	// +optional
	Reason string `json:"reason,omitempty"`
	// +optional
	Message string `json:"message,omitempty"`
}

func NewSuccessCommandCondition() CommandCondition {
	return CommandCondition{
		Type:              CommandConditionTypeSuccess,
		Status:            v1.ConditionTrue,
		LastHeartbeatTime: metav1.Now(),
		Reason:            "Apply Command",
		Message:           "Applied to cluster successfully",
	}
}

func NewFailedCommandCondition(message string) CommandCondition {
	return CommandCondition{
		Type:              CommandConditionTypeError,
		Status:            v1.ConditionFalse,
		LastHeartbeatTime: metav1.Now(),
		Reason:            "Apply Command",
		Message:           message,
	}
}

func NewCancelledCommandCondition(message string) CommandCondition {
	return CommandCondition{
		Type:              CommandConditionTypeCancelled,
		Status:            v1.ConditionFalse,
		LastHeartbeatTime: metav1.Now(),
		Reason:            "Apply Command",
		Message:           message,
	}
}

type ClusterStatus struct {
	Phase             ClusterPhase       `json:"phase,omitempty"`
	Mounts            []MountImage       `json:"mounts,omitempty"`
	Conditions        []ClusterCondition `json:"conditions,omitempty"`
	CommandConditions []CommandCondition `json:"commandCondition,omitempty"`
}

type SSH struct {
	User     string `json:"user,omitempty"`
	Passwd   string `json:"passwd,omitempty"`
	PkName   string `json:"pkName,omitempty"`
	PkData   string `json:"pkData,omitempty"`
	Pk       string `json:"pk,omitempty"`
	PkPasswd string `json:"pkPasswd,omitempty"`
	Port     uint16 `json:"port,omitempty"`
}

type Host struct {
	IPS   []string `json:"ips,omitempty"`
	Roles []string `json:"roles,omitempty"`
	//overwrite env
	Env []string `json:"env,omitempty"`
}

type ImageList []string

// ClusterSpec defines the desired state of InfraMetadata
type ClusterSpec struct {
	// desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file
	// Foo is an example field of Cluster. Edit Cluster_types.go to remove/update
	Image ImageList `json:"image,omitempty"`
	SSH   SSH       `json:"ssh"`
	Hosts []Host    `json:"hosts,omitempty"`
	// Why env not using map[string]string
	// Because some argument is list, like: CertSANS=127.0.0.1 CertSANS=localhost, if ENV is map, will merge those two values
	// but user want to InfraMetadata a list, using array we can convert it to {CertSANS:[127.0.0.1, localhost]}
	Env []string `json:"env,omitempty"`
	// Entrypoint array. Not executed within a shell.
	// The docker image's ENTRYPOINT is used if this is not provided.
	// Variable references $(VAR_NAME) are expanded using the container's environment. If a variable
	// cannot be resolved, the reference in the input string will be unchanged. Double $$ are reduced
	// to a single $, which allows for escaping the $(VAR_NAME) syntax: i.e. "$$(VAR_NAME)" will
	// produce the string literal "$(VAR_NAME)". Escaped references will never be expanded, regardless
	// of whether the variable exists or not. Cannot be updated.
	// More info: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/#running-a-command-in-a-shell
	// +optional
	Command []string `json:"command,omitempty"`
}
