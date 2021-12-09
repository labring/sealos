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

package net

import (
	"fmt"
	"testing"
)

func TestNewNetwork(t *testing.T) {
	netyaml := NewNetwork("calico", MetaData{
		Interface: "interface=en.*|eth.*",
		CIDR:      "10.1.1.1/24",
		IPIP:      true,
		MTU:       "1440",
	}).Manifests("")
	fmt.Println(netyaml)

	netyaml = NewNetwork("cilium", MetaData{
		CIDR:           "10.1.1.1/24",
		K8sServiceHost: "127.0.0.1",
		// K8sServicePort: "6443",
	}).Manifests("")
	fmt.Println(netyaml)
}

func TestNewNetworkCalico(t *testing.T) {
	netyaml := NewNetwork("calico", MetaData{
		Interface:      "interface=en.*|eth.*",
		CIDR:           "10.1.1.1/24",
		IPIP:           true,
		MTU:            "1440",
		CniRepo:        "",
		K8sServiceHost: "127.0.0.1",
		Version:        "v3.8.2",
	}).Manifests("")
	fmt.Println(netyaml)

	netyaml = NewNetwork("calico", MetaData{
		Interface:      "interface=en.*|eth.*",
		CIDR:           "10.1.1.1/24",
		IPIP:           true,
		MTU:            "1440",
		CniRepo:        "",
		K8sServiceHost: "127.0.0.1",
		Version:        "",
	}).Manifests("")
	fmt.Println(netyaml)
}
