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

package config

import (
	"reflect"
	"testing"

	"github.com/fanux/sealos/pkg/utils/iputils"

	v1 "github.com/fanux/sealos/pkg/types/v1alpha1"
	"github.com/fanux/sealos/pkg/utils/ssh"
)

func Test_generatorKubeadmConfig(t *testing.T) {
	kubeadmConfig()
}

func TestTemplate(t *testing.T) {
	var masters = []string{"172.20.241.205:22", "172.20.241.206:22", "172.20.241.207:22"}
	var vip = "10.103.97.1"
	config := ssh.SSH{
		User:     "cuisongliu",
		Password: "admin",
	}
	v1.MasterIPs = masters
	v1.VIP = vip
	v1.APIServer = "apiserver.cluster.local"
	config.Cmd("127.0.0.1", "echo \""+string(Template())+"\" > ~/aa")
	t.Log(string(Template()))
}

var testYaml = `apiVersion: kubeadm.k8s.io/v1beta1
kind: ClusterConfiguration
kubernetesVersion: v1.18.0
controlPlaneEndpoint: apiserver.cluster.local:6443
imageRepository: k8s.gcr.io
networking:
  # dnsDomain: cluster.local
  podSubnet: 100.64.0.0/10
  serviceSubnet: 10.96.0.0/12
apiServer:
  certSANs:
  - 127.0.0.1
  - apiserver.cluster.local
  - 172.16.9.202
  - 172.16.9.200
  - 172.16.9.201
  - 10.103.97.2
  extraArgs:
    feature-gates: TTLAfterFinished=true
  extraVolumes:
  - name: localtime
    hostPath: /etc/localtime
    mountPath: /etc/localtime
    readOnly: true
    pathType: File
controllerManager:
  extraArgs:
    feature-gates: TTLAfterFinished=true
  extraVolumes:
  - hostPath: /etc/localtime
    mountPath: /etc/localtime
    name: localtime
    readOnly: true
    pathType: File
scheduler:
  extraArgs:
    feature-gates: TTLAfterFinished=true
  extraVolumes:
  - hostPath: /etc/localtime
    mountPath: /etc/localtime
    name: localtime
    readOnly: true
    pathType: File
---
apiVersion: kubeproxy.config.k8s.io/v1alpha1
kind: KubeProxyConfiguration
mode: ipvs
ipvs:
  excludeCIDRs: 
  - 10.103.97.2/32
`

func TestKubeadmDataFromYaml(t *testing.T) {
	type args struct {
		context string
	}
	tests := []struct {
		name string
		args args
		want *KubeadmType
	}{
		{
			"test decode yaml altnames",
			args{testYaml},
			&KubeadmType{
				Kind: "ClusterConfiguration",
				APIServer: struct {
					CertSANs []string `yaml:"certSANs,omitempty"`
				}{},
				Networking: struct {
					DNSDomain string `yaml:"dnsDomain,omitempty"`
				}{},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := KubeadmDataFromYaml(tt.args.context)
			if !reflect.DeepEqual(got.APIServer.CertSANs, []string{"127.0.0.1", "apiserver.cluster.local", "172.16.9.202", "172.16.9.200", "172.16.9.201", "10.103.97.2"}) {
				t.Errorf("%v", got)
			}
		})
	}
}

func TestJoinTemplate(t *testing.T) {
	var masters = []string{"192.168.160.243:22"}
	var vip = "10.103.97.1"
	config := ssh.SSH{
		User:     "louis",
		Password: "210010",
		PkFile:   "/home/louis/.ssh/id_rsa",
	}
	v1.Version = "v1.20.0"
	v1.MasterIPs = masters
	v1.JoinToken = "1y6yyl.ramfafiy99vz3tbw"
	v1.TokenCaCertHash = "sha256:a68c79c87368ff794ae50c5fd6a8ce13fdb2778764f1080614ddfeaa0e2b9d14"

	v1.VIP = vip
	config.Cmd("127.0.0.1", "echo \""+string(JoinTemplate(iputils.IPFormat(masters[0]), "systemd"))+"\" > ~/aa")
	t.Log(string(JoinTemplate(iputils.IPFormat(masters[0]), "cgroupfs")))

	v1.Version = "v1.19.0"
	config.Cmd("127.0.0.1", "echo \""+string(JoinTemplate("", "systemd"))+"\" > ~/aa")
	t.Log(string(JoinTemplate("", "cgroupfs")))
}
