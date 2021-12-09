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
	"bytes"
	"text/template"
)

const (
	CALICO                = "calico"
	FLANNEL               = "flannel"
	CILIUM                = "cilium"
	defaultInterface      = "eth.*|en.*"
	defaultCIDR           = "100.64.0.0/10"
	defaultK8sServiceHost = "127.0.0.1"
	defaultK8sServicePort = "6443"
	defaultCNIRepo        = "k8s.gcr.io"
)

type MetaData struct {
	Interface string
	CIDR      string
	// ipip mode for calico.yml
	IPIP bool
	// MTU size
	MTU            string
	CniRepo        string
	K8sServiceHost string
	K8sServicePort string
	Version        string
}

// Net is CNI interface
type Net interface {
	// if template is "" using default template
	Manifests(template string) string
	// return cni template file
	Template() string
}

func NewNetwork(t string, metadata MetaData) Net {
	switch t {
	case CALICO:
		return &Calico{metadata: metadata}
	case FLANNEL:
		return &Flannel{metadata: metadata}
	case CILIUM:
		return &Cilium{metadata: metadata}
	default:
		return &Calico{metadata: metadata}
	}
}

func render(data MetaData, temp string) string {
	var b bytes.Buffer
	t := template.Must(template.New("net").Parse(temp))
	_ = t.Execute(&b, &data)
	return b.String()
}
