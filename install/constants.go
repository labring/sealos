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

package install

const (
	ErrorExitOSCase = -1 // 错误直接退出类型

	ErrorMasterEmpty    = "your master is empty."             // master节点ip为空
	ErrorVersionEmpty   = "your kubernetes version is empty." // kubernetes 版本号为空
	ErrorFileNotExist   = "your package file is not exist."   // 离线安装包为空
	ErrorPkgURLNotExist = "Your package url is incorrect."    // 离线安装包为http路径不对

	// etcd backup
	ETCDSNAPSHOTDEFAULTNAME = "snapshot"
	ETCDDEFAULTBACKUPDIR    = "/opt/sealos/etcd-backup"
	ETCDDEFAULTRESTOREDIR   = "/opt/sealos/etcd-restore"
	ETCDDATADIR             = "/var/lib/etcd"
	TMPDIR                  = "/tmp"

	// kube file
	KUBECONTROLLERCONFIGFILE = "/etc/kubernetes/controller-manager.conf"
	KUBESCHEDULERCONFIGFILE  = "/etc/kubernetes/scheduler.conf"

	// CriSocket
	DefaultDockerCRISocket     = "/var/run/dockershim.sock"
	DefaultContainerdCRISocket = "/run/containerd/containerd.sock"
	DefaultCgroupDriver        = "cgroupfs"
	DefaultSystemdCgroupDriver = "systemd"

	KubeadmV1beta1 = "kubeadm.k8s.io/v1beta1"
	KubeadmV1beta2 = "kubeadm.k8s.io/v1beta2"
	KubeadmV1beta3 = "kubeadm.k8s.io/v1beta3"
	/*
	   A list of changes since v1beta1:

	   `certificateKey" field is added to InitConfiguration and JoinConfiguration.
	   "ignorePreflightErrors" field is added to the NodeRegistrationOptions.
	   The JSON "omitempty" tag is used in a more places where appropriate.
	   The JSON "omitempty" tag of the "taints" field (inside NodeRegistrationOptions) is removed. See the Kubernetes 1.15 changelog for further details.


	   A list of changes since v1beta2:

	   The deprecated ClusterConfiguration.useHyperKubeImage field has been removed. Kubeadm no longer supports the hyperkube image.
	   The ClusterConfiguration.dns.type field has been removed since CoreDNS is the only supported DNS server type by kubeadm.
	   Include "datapolicy" tags on the fields that hold secrets. This would result in the field values to be omitted when API structures are printed with klog.
	   Add InitConfiguration.skipPhases, JoinConfiguration.skipPhases to allow skipping a list of phases during kubeadm init/join command execution.
	   Add InitConfiguration.nodeRegistration.imagePullPolicy" andJoinConfiguration.nodeRegistration.imagePullPolicy` to allow specifying the images pull policy during kubeadm "init" and "join". The value must be one of "Always", "Never" or "IfNotPresent". "IfNotPresent" is the default, which has been the existing behavior prior to this addition.
	   Add InitConfiguration.patches.directory, JoinConfiguration.patches.directory to allow the user to configure a directory from which to take patches for components deployed by kubeadm.
	   Move the BootstrapToken&lowast; API and related utilities out of the "kubeadm" API group to a new group "bootstraptoken". The kubeadm API version v1beta3 no longer contains the BootstrapToken&lowast; structures.

	*/
)

const (
	InitTemplateText = string(InitConfigurationDefault +
		ClusterConfigurationDefault +
		kubeproxyConfigDefault +
		kubeletConfigDefault)
	JoinCPTemplateText = string(bootstrapTokenDefault +
		JoinConfigurationDefault +
		kubeletConfigDefault)

	bootstrapTokenDefault = `apiVersion: {{.KubeadmApi}}
caCertPath: /etc/kubernetes/pki/ca.crt
discovery:
  bootstrapToken:
    {{- if .Master}}
    apiServerEndpoint: {{.Master0}}:6443
    {{else}}
    apiServerEndpoint: {{.VIP}}:6443
    {{end -}}
    token: {{.TokenDiscovery}}
    caCertHashes:
    - {{.TokenDiscoveryCAHash}}
  timeout: 5m0s
`
	InitConfigurationDefault = `apiVersion: {{.KubeadmApi}}
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: {{.Master0}}
  bindPort: 6443
nodeRegistration:
  criSocket: {{.CriSocket}}
`

	JoinConfigurationDefault = `
kind: JoinConfiguration
{{- if .Master }}
controlPlane:
  localAPIEndpoint:
    advertiseAddress: {{.Master}}
    bindPort: 6443
{{- end}}
nodeRegistration:
  criSocket: {{.CriSocket}}
`

	ClusterConfigurationDefault = `---
apiVersion: {{.KubeadmApi}}
kind: ClusterConfiguration
kubernetesVersion: {{.Version}}
controlPlaneEndpoint: "{{.ApiServer}}:6443"
imageRepository: {{.Repo}}
networking:
  # dnsDomain: cluster.local
  podSubnet: {{.PodCIDR}}
  serviceSubnet: {{.SvcCIDR}}
apiServer:
  certSANs:
  - 127.0.0.1
  - {{.ApiServer}}
  {{range .Masters -}}
  - {{.}}
  {{end -}}
  {{range .CertSANS -}}
  - {{.}}
  {{end -}}
  - {{.VIP}}
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
    experimental-cluster-signing-duration: 876000h
{{- if eq .Network "cilium" }}
    allocate-node-cidrs: \"true\"
{{- end }}
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
`
	kubeproxyConfigDefault = `
---
apiVersion: kubeproxy.config.k8s.io/v1alpha1
kind: KubeProxyConfiguration
mode: "ipvs"
ipvs:
  excludeCIDRs:
  - "{{.VIP}}/32"
`
	kubeletConfigDefault = `
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
cgroupDriver: {{ .CgroupDriver}}
cgroupsPerQOS: true
clusterDomain: cluster.local
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
  imagefs.available: 15%
  memory.available: 100Mi
  nodefs.available: 10%
  nodefs.inodesFree: 5%
evictionPressureTransitionPeriod: 5m0s
failSwapOn: true
fileCheckFrequency: 20s
hairpinMode: promiscuous-bridge
healthzBindAddress: 127.0.0.1
healthzPort: 10248
httpCheckFrequency: 20s
imageGCHighThresholdPercent: 85
imageGCLowThresholdPercent: 80
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
volumeStatsAggPeriod: 1m0s`

	ContainerdShell = `if grep "SystemdCgroup = true"  /etc/containerd/config.toml &> /dev/null; then  
driver=systemd
else
driver=cgroupfs
fi
echo ${driver}`
	DockerShell = `driver=$(docker info -f "{{.CgroupDriver}}")
	echo "${driver}"`
)
