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

/*
Application config file:

Clusterfile:

apiVersion: apps.sealos.io/v1beta1
kind: Cluster
metadata:
  name: my-cluster
spec:
  image: registry.cn-qingdao.aliyuncs.com/sealos-app/my-SAAS-all-inone:latest
  provider: BAREMETAL
---
apiVersion: apps.sealos.io/v1beta1
kind: Config
metadata:
  name: mysql-config
spec:
  path: etc/mysql-config.yaml
  data: |
       mysql-user: root
       mysql-passwd: xxx
...
---
apiVersion: apps.sealos.io/v1beta1
kind: Config
metadata:
  name: redis-config
spec:
  path: etc/redis-config.yaml
  data: |
       redis-user: root
       redis-passwd: xxx
...

When apply this Clusterfile, sealos will generate some values file for application config. Named etc/mysql-config.yaml etc/redis-config.yaml.

So if you want to use those config, Kubefile is like this:

FROM kuberentes:v1.19.9
CMD helm install mysql -f etc/mysql-config.yaml
CMD helm install mysql -f etc/redis-config.yaml
*/

package v1beta1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type StrategyType string

const (
	Merge    StrategyType = "merge"
	Override StrategyType = "override"
	Insert   StrategyType = "insert"
	Append   StrategyType = "append"
)

// ConfigSpec defines the desired state of Config
type ConfigSpec struct {
	Match    string       `json:"match,omitempty"`
	Strategy StrategyType `json:"strategy,omitempty"`
	Data     string       `json:"data,omitempty"`
	Path     string       `json:"path,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// Config is the Schema for the configs API
type Config struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec ConfigSpec `json:"spec,omitempty"`
}

// +kubebuilder:object:root=true
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// ConfigList contains a list of Config
type ConfigList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Config `json:"items"`
}
