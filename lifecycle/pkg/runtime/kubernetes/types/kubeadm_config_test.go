/*
Copyright 2023 cuisongliu@qq.com.

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

package types

import (
	"testing"

	"github.com/labring/sealos/pkg/runtime/decode"
	"github.com/labring/sealos/pkg/utils/yaml"
)

func TestKubeadmRuntime_setFeatureGatesConfiguration(t *testing.T) {
	tests := []struct {
		name    string
		version string
	}{
		{
			name:    "v1.19.0",
			version: "v1.19.0",
		},
		{
			name:    "v1.25.0",
			version: "v1.25.0",
		},
		{
			name:    "v1.27.0",
			version: "v1.27.0",
		},
		{
			name:    "v1.26.0",
			version: "v1.26.0",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			k, err := LoadKubeadmConfigs(defaultKubeadmConfig, false, decode.CRDFromString)
			if err != nil {
				t.Fatalf("error loading default kubeadm config: %v", err)
			}

			k.SetKubeVersion(tt.version)
			k.FinalizeFeatureGatesConfiguration()
			data, err := yaml.MarshalConfigs(
				&k.InitConfiguration,
				&k.ClusterConfiguration,
				&k.KubeletConfiguration,
				&k.KubeProxyConfiguration,
			)
			if err != nil {
				t.Fatalf("error marshalling kubeadm config: %v", err)
			}
			t.Log(string(data))
		})
	}
}
func TestKubeadmRuntime_setFeatureGatesConfiguration4Controller(t *testing.T) {
	testyaml := `apiVersion: kubeadm.k8s.io/v1beta2
kind: ClusterConfiguration
kubernetesVersion: v1.19.8
#controlPlaneEndpoint: "apiserver.cluster.local:6443"
networking:
  # dnsDomain: cluster.local
  podSubnet: 100.64.0.0/10
  serviceSubnet: 10.96.0.0/22
apiServer:
  #  certSANs:
  #    - 127.0.0.1
  #    - apiserver.cluster.local
  #    - aliyun-inc.com
  #    - 10.0.0.2
  #    - 10.103.97.2
  extraArgs:
    #    etcd-servers: https://192.168.2.110:2379
    feature-gates: TTLAfterFinished=true,EphemeralContainers=true
    audit-policy-file: "/etc/kubernetes/audit-policy.yml"
    audit-log-path: "/var/log/kubernetes/audit.log"
    audit-log-format: json
    audit-log-maxbackup: '10'
    audit-log-maxsize: '100'
    audit-log-maxage: '7'
    enable-aggregator-routing: 'true'
  extraVolumes:
    - name: "audit"
      hostPath: "/etc/kubernetes"
      mountPath: "/etc/kubernetes"
      pathType: DirectoryOrCreate
    - name: "audit-log"
      hostPath: "/var/log/kubernetes"
      mountPath: "/var/log/kubernetes"
      pathType: DirectoryOrCreate
    - name: localtime
      hostPath: /etc/localtime
      mountPath: /etc/localtime
      readOnly: true
      pathType: File
controllerManager:
  extraArgs:
    bind-address: 0.0.0.0
    feature-gates: TTLAfterFinished=true,EphemeralContainers=true
    cluster-signing-duration: 876000h
  extraVolumes:
    - hostPath: /etc/localtime
      mountPath: /etc/localtime
      name: localtime
      readOnly: true
      pathType: File
scheduler:
  extraArgs:
    bind-address: 0.0.0.0
    feature-gates: TTLAfterFinished=true,EphemeralContainers=true
  extraVolumes:
    - hostPath: /etc/localtime
      mountPath: /etc/localtime
      name: localtime
      readOnly: true
      pathType: File
etcd:
  local:
    extraArgs:
      listen-metrics-urls: http://0.0.0.0:2381
`
	tests := []struct {
		name    string
		version string
	}{
		{
			name:    "v1.19.0",
			version: "v1.19.0",
		},
		{
			name:    "v1.25.0",
			version: "v1.25.0",
		},
		{
			name:    "v1.27.0",
			version: "v1.27.0",
		},
		{
			name:    "v1.26.0",
			version: "v1.26.0",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			k, err := LoadKubeadmConfigs(testyaml, false, decode.CRDFromString)
			if err != nil {
				t.Fatalf("error loading default kubeadm config: %v", err)
			}

			k.SetKubeVersion(tt.version)
			k.FinalizeFeatureGatesConfiguration()
			data, err := yaml.MarshalConfigs(
				&k.ClusterConfiguration,
			)
			if err != nil {
				t.Fatalf("error marshalling kubeadm config: %v", err)
			}
			t.Log(string(data))
		})
	}
}
