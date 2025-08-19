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

package types_test

import (
	"testing"

	"github.com/labring/sealos/pkg/runtime/decode"
	"github.com/labring/sealos/pkg/runtime/kubernetes/types"
	"github.com/labring/sealos/pkg/utils/yaml"
)

const (
	testLowerKubeadmConfig = `apiVersion: kubeadm.k8s.io/v1beta3
certificateKey: a33633c42a66e0bafaaac861942db01c6a0d1802557bf77db4c2dd074587902d
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: 192.168.64.4
  bindPort: 6443
nodeRegistration:
  criSocket: unix:///run/containerd/containerd.sock
  imagePullPolicy: Never
  kubeletExtraArgs:
    node-ip: 192.168.64.4
  taints: []

---
apiServer:
  certSANs:
  - 127.0.0.1
  - apiserver.cluster.local
  - 10.103.97.2
  - 192.168.64.4
  extraArgs:
    audit-log-format: json
    audit-log-maxage: "7"
    audit-log-maxbackup: "10"
    audit-log-maxsize: "100"
    audit-log-path: /var/log/kubernetes/audit.log
    audit-policy-file: /etc/kubernetes/audit-policy.yml
    enable-aggregator-routing: "true"
    feature-gates: ""
  extraVolumes:
  - hostPath: /etc/kubernetes
    mountPath: /etc/kubernetes
    name: audit
    pathType: DirectoryOrCreate
  - hostPath: /var/log/kubernetes
    mountPath: /var/log/kubernetes
    name: audit-log
    pathType: DirectoryOrCreate
  - hostPath: /etc/localtime
    mountPath: /etc/localtime
    name: localtime
    pathType: File
    readOnly: true
apiVersion: kubeadm.k8s.io/v1beta3
controlPlaneEndpoint: apiserver.cluster.local:6443
controllerManager:
  extraArgs:
    bind-address: 0.0.0.0
    cluster-signing-duration: 876000h
    feature-gates: ""
  extraVolumes:
  - hostPath: /etc/localtime
    mountPath: /etc/localtime
    name: localtime
    pathType: File
    readOnly: true
dns: {}
etcd:
  local:
    dataDir: ""
    extraArgs:
      listen-metrics-urls: http://0.0.0.0:2381
kind: ClusterConfiguration
kubernetesVersion: v1.27.0
networking:
  podSubnet: 100.64.0.0/10
  serviceSubnet: 10.96.0.0/22
scheduler:
  extraArgs:
    bind-address: 0.0.0.0
    feature-gates: ""
  extraVolumes:
  - hostPath: /etc/localtime
    mountPath: /etc/localtime
    name: localtime
    pathType: File
    readOnly: true

---
address: 0.0.0.0
apiVersion: kubelet.config.k8s.io/v1beta1
authentication:
  anonymous:
    enabled: false
  webhook:
    cacheTTL: 2m0s
    enabled: true
  x509:
    clientCAFile: /etc/kubernetes/pki/ca.crt
authorization:
  mode: Webhook
  webhook:
    cacheAuthorizedTTL: 5m0s
    cacheUnauthorizedTTL: 30s
cgroupDriver: systemd
cgroupsPerQOS: true
configMapAndSecretChangeDetectionStrategy: Watch
containerLogMaxFiles: 5
containerLogMaxSize: 10Mi
containerLogMaxWorkers: 1
containerLogMonitorInterval: 10s
containerRuntimeEndpoint: unix:///run/containerd/containerd.sock
contentType: application/vnd.kubernetes.protobuf
cpuCFSQuota: true
cpuCFSQuotaPeriod: 100ms
cpuManagerPolicy: none
cpuManagerReconcilePeriod: 10s
enableControllerAttachDetach: true
enableDebugFlagsHandler: true
enableDebuggingHandlers: true
enableProfilingHandler: true
enableServer: true
enableSystemLogHandler: true
enforceNodeAllocatable:
- pods
eventBurst: 10
eventRecordQPS: 5
evictionHard:
  imagefs.available: 10%
  memory.available: 100Mi
  nodefs.available: 10%
  nodefs.inodesFree: 5%
evictionPressureTransitionPeriod: 5m0s
failSwapOn: true
fileCheckFrequency: 20s
hairpinMode: promiscuous-bridge
healthzBindAddress: 0.0.0.0
healthzPort: 10248
httpCheckFrequency: 20s
imageGCHighThresholdPercent: 85
imageGCLowThresholdPercent: 75
imageMaximumGCAge: 0s
imageMinimumGCAge: 2m0s
imageServiceEndpoint: unix:///var/run/image-cri-shim.sock
iptablesDropBit: 15
iptablesMasqueradeBit: 14
kind: KubeletConfiguration
kubeAPIBurst: 10
kubeAPIQPS: 5
localStorageCapacityIsolation: true
logging:
  flushFrequency: 5000000000
  format: text
  options:
    json:
      infoBufferSize: "0"
    text:
      infoBufferSize: "0"
  verbosity: 0
makeIPTablesUtilChains: true
maxOpenFiles: 1000000
maxPods: 110
memoryManagerPolicy: None
memorySwap: {}
memoryThrottlingFactor: 0.9
nodeLeaseDurationSeconds: 40
nodeStatusMaxImages: 50
nodeStatusReportFrequency: 10s
nodeStatusUpdateFrequency: 10s
oomScoreAdj: -999
podLogsDir: /var/log/pods
podPidsLimit: -1
port: 10250
registerNode: true
registryBurst: 10
registryPullQPS: 5
rotateCertificates: true
runtimeRequestTimeout: 2m0s
seccompDefault: false
serializeImagePulls: true
shutdownGracePeriod: 0s
shutdownGracePeriodCriticalPods: 0s
staticPodPath: /etc/kubernetes/manifests
streamingConnectionIdleTimeout: 4h0m0s
syncFrequency: 1m0s
topologyManagerPolicy: none
topologyManagerScope: container
volumePluginDir: /usr/libexec/kubernetes/kubelet-plugins/volume/exec/
volumeStatsAggPeriod: 1m0s

---
apiVersion: kubeproxy.config.k8s.io/v1alpha1
bindAddress: 0.0.0.0
bindAddressHardFail: false
clientConnection:
  acceptContentTypes: ""
  burst: 10
  contentType: application/vnd.kubernetes.protobuf
  kubeconfig: ""
  qps: 5
clusterCIDR: ""
configSyncPeriod: 15m0s
conntrack:
  maxPerCore: 32768
  min: 131072
  tcpBeLiberal: false
  tcpCloseWaitTimeout: 1h0m0s
  tcpEstablishedTimeout: 24h0m0s
  udpStreamTimeout: 0s
  udpTimeout: 0s
detectLocal:
  bridgeInterface: ""
  interfaceNamePrefix: ""
detectLocalMode: ""
enableProfiling: false
healthzBindAddress: 0.0.0.0:10256
hostnameOverride: ""
iptables:
  localhostNodePorts: true
  masqueradeAll: false
  masqueradeBit: 14
  minSyncPeriod: 1s
  syncPeriod: 30s
ipvs:
  excludeCIDRs:
  - 10.103.97.2/32
  minSyncPeriod: 0s
  scheduler: ""
  strictARP: false
  syncPeriod: 30s
  tcpFinTimeout: 0s
  tcpTimeout: 0s
  udpTimeout: 0s
kind: KubeProxyConfiguration
logging:
  flushFrequency: 5s
  format: text
  options:
    json:
      infoBufferSize: "0"
    text:
      infoBufferSize: "0"
  verbosity: 0
metricsBindAddress: 0.0.0.0:10249
mode: ipvs
nftables:
  masqueradeAll: false
  masqueradeBit: 14
  minSyncPeriod: 1s
  syncPeriod: 30s
nodePortAddresses: null
oomScoreAdj: -999
portRange: ""
showHiddenMetricsForVersion: ""
winkernel:
  enableDSR: false
  forwardHealthCheckVip: false
  networkName: ""
  rootHnsEndpointName: ""
  sourceVip: ""`
)

func TestKubeadmRuntime_setFeatureGatesConfigurationLowerVersion(t *testing.T) {
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
			k, err := types.LoadKubeadmConfigs(testLowerKubeadmConfig, false, decode.CRDFromString)
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
			k, err := types.LoadKubeadmConfigs(
				types.DefaultKubeadmInitConfiguration(),
				false,
				decode.CRDFromString,
			)
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
			k, err := types.LoadKubeadmConfigs(testyaml, false, decode.CRDFromString)
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
