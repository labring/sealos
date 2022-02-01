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
	"bytes"
	"fmt"
	"strings"
	"text/template"

	"github.com/fanux/sealos/pkg/utils/versionutil"

	"github.com/fanux/sealos/pkg/utils/iputils"

	"github.com/fanux/sealos/pkg/utils/logger"

	"github.com/fanux/sealos/pkg/utils/cri"

	v1 "github.com/fanux/sealos/pkg/types/v1alpha1"
	"sigs.k8s.io/yaml"
)

var ConfigType string

const (
	KubeadmV1beta1   = "kubeadm.k8s.io/v1beta1"
	KubeadmV1beta2   = "kubeadm.k8s.io/v1beta2"
	KubeadmV1beta3   = "kubeadm.k8s.io/v1beta3"
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
    feature-gates: TTLAfterFinished=true,EphemeralContainers=true
    experimental-cluster-signing-duration: 876000h
  extraVolumes:
  - hostPath: /etc/localtime
    mountPath: /etc/localtime
    name: localtime
    readOnly: true
    pathType: File
scheduler:
  extraArgs:
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
)

func setKubeadmAPI(version string) {
	major, _ := versionutil.GetMajorMinorInt(version)
	switch {
	//
	case major < 120:
		v1.KubeadmAPI = KubeadmV1beta1
		v1.CriSocket = cri.DefaultDockerCRISocket
	case major < 123 && major >= 120:
		v1.KubeadmAPI = KubeadmV1beta2
		v1.CriSocket = cri.DefaultContainerdCRISocket
	case major >= 123:
		v1.KubeadmAPI = KubeadmV1beta3
		v1.CriSocket = cri.DefaultContainerdCRISocket
	default:
		v1.KubeadmAPI = KubeadmV1beta3
		v1.CriSocket = cri.DefaultContainerdCRISocket
	}
	logger.Debug("KubeadmApi: %s", v1.KubeadmAPI)
	logger.Debug("CriSocket: %s", v1.CriSocket)
}

func Config() {
	switch ConfigType {
	case "kubeadm":
		printlnKubeadmConfig()
	case "join":
		printlnJoinKubeadmConfig()
	default:
		printlnKubeadmConfig()
	}
}

func joinKubeadmConfig() string {
	var sb strings.Builder
	sb.Write([]byte(JoinCPTemplateText))
	return sb.String()
}

func printlnJoinKubeadmConfig() {
	fmt.Println(joinKubeadmConfig())
}

func kubeadmConfig() string {
	var sb strings.Builder
	sb.Write([]byte(InitTemplateText))
	return sb.String()
}

func printlnKubeadmConfig() {
	fmt.Println(kubeadmConfig())
}

//Template is
func Template() []byte {
	return TemplateFromTemplateContent(kubeadmConfig())
}

// JoinTemplate is generate JoinCP nodes configuration by master ip.
func JoinTemplate(ip string, cgroup string) []byte {
	return JoinTemplateFromTemplateContent(joinKubeadmConfig(), ip, cgroup)
}

func JoinTemplateFromTemplateContent(templateContent, ip, cgroup string) []byte {
	setKubeadmAPI(v1.Version)
	tmpl, err := template.New("text").Parse(templateContent)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("join template parse failed:", err)
		}
	}()
	if err != nil {
		panic(1)
	}
	var envMap = make(map[string]interface{})
	envMap["Master0"] = iputils.IPFormat(v1.MasterIPs[0])
	envMap["Master"] = ip
	envMap["TokenDiscovery"] = v1.JoinToken
	envMap["TokenDiscoveryCAHash"] = v1.TokenCaCertHash
	envMap["VIP"] = v1.VIP
	envMap["KubeadmApi"] = v1.KubeadmAPI
	envMap["CriSocket"] = v1.CriSocket
	envMap["CgroupDriver"] = cgroup
	var buffer bytes.Buffer
	_ = tmpl.Execute(&buffer, envMap)
	return buffer.Bytes()
}

func TemplateFromTemplateContent(templateContent string) []byte {
	setKubeadmAPI(v1.Version)
	tmpl, err := template.New("text").Parse(templateContent)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("template parse failed:", err)
		}
	}()
	if err != nil {
		panic(1)
	}
	var masters []string
	getmasters := v1.MasterIPs
	for _, h := range getmasters {
		masters = append(masters, iputils.IPFormat(h))
	}
	var envMap = make(map[string]interface{})
	envMap["CertSANS"] = v1.CertSANS
	envMap["VIP"] = v1.VIP
	envMap["Masters"] = masters
	envMap["Version"] = v1.Version
	envMap["ApiServer"] = v1.APIServer
	envMap["PodCIDR"] = v1.PodCIDR
	envMap["SvcCIDR"] = v1.SvcCIDR
	envMap["Repo"] = v1.Repo
	envMap["Master0"] = iputils.IPFormat(v1.MasterIPs[0])
	envMap["CgroupDriver"] = v1.CgroupDriver
	envMap["KubeadmApi"] = v1.KubeadmAPI
	envMap["CriSocket"] = v1.CriSocket
	var buffer bytes.Buffer
	_ = tmpl.Execute(&buffer, envMap)
	return buffer.Bytes()
}

//根据yaml转换kubeadm结构
func KubeadmDataFromYaml(context string) *KubeadmType {
	yamls := strings.Split(context, "---")
	if len(yamls) > 0 {
		for _, y := range yamls {
			cfg := strings.TrimSpace(y)
			if cfg == "" {
				continue
			} else {
				kubeadm := &KubeadmType{}
				if err := yaml.Unmarshal([]byte(cfg), kubeadm); err == nil {
					//
					if kubeadm.Kind == "ClusterConfiguration" {
						if kubeadm.Networking.DNSDomain == "" {
							kubeadm.Networking.DNSDomain = "cluster.local"
						}
						return kubeadm
					}
				}
			}
		}
	}
	return nil
}

type KubeadmType struct {
	Kind      string `yaml:"kind,omitempty"`
	APIServer struct {
		CertSANs []string `yaml:"certSANs,omitempty"`
	} `yaml:"apiServer"`
	Networking struct {
		DNSDomain string `yaml:"dnsDomain,omitempty"`
	} `yaml:"networking"`
}
