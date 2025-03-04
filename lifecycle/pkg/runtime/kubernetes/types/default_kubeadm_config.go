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

package types

const (
	defaultKubeadmConfig = `apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
localAPIEndpoint:
  # advertiseAddress: 192.168.2.110
  bindPort: 6443
nodeRegistration:
  criSocket: /run/containerd/containerd.sock

---
apiVersion: kubeadm.k8s.io/v1beta3
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

---
apiVersion: kubeproxy.config.k8s.io/v1alpha1
kind: KubeProxyConfiguration
mode: "ipvs"
metricsBindAddress: 0.0.0.0
#ipvs:
#  excludeCIDRs:
#    - "10.103.97.2/32"

---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
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
cgroupsPerQOS: true
#clusterDomain: cluster.local
configMapAndSecretChangeDetectionStrategy: Watch
containerLogMaxFiles: 5
containerLogMaxSize: 10Mi
contentType: application/vnd.kubernetes.protobuf
cpuCFSQuota: true
cpuCFSQuotaPeriod: 100ms
cpuManagerPolicy: none
cpuManagerReconcilePeriod: 10s
enableControllerAttachDetach: true
enableDebuggingHandlers: true
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
imageMinimumGCAge: 2m0s
iptablesDropBit: 15
iptablesMasqueradeBit: 14
kubeAPIBurst: 10
kubeAPIQPS: 5
makeIPTablesUtilChains: true
maxOpenFiles: 1000000
maxPods: 110
nodeLeaseDurationSeconds: 40
nodeStatusReportFrequency: 10s
nodeStatusUpdateFrequency: 10s
oomScoreAdj: -999
podPidsLimit: -1
port: 10250
registryBurst: 10
registryPullQPS: 5
rotateCertificates: true
runtimeRequestTimeout: 2m0s
serializeImagePulls: true
staticPodPath: /etc/kubernetes/manifests
streamingConnectionIdleTimeout: 4h0m0s
syncFrequency: 1m0s
volumeStatsAggPeriod: 1m0s
enableServer: true
registerNode: true
nodeStatusMaxImages: 50
enableProfilingHandler: true
enableSystemLogHandler: true
featureGates:
  TTLAfterFinished: true
  EphemeralContainers: true
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: JoinConfiguration
caCertPath: /etc/kubernetes/pki/ca.crt
discovery:
  timeout: 5m0s
nodeRegistration:
  criSocket: /run/containerd/containerd.sock
controlPlane:
  localAPIEndpoint:
    # advertiseAddress: 192.168.56.7
    bindPort: 6443`
)
