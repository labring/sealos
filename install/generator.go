package install

import (
	"bytes"
	"fmt"
	"github.com/ghodss/yaml"
	"github.com/wonderivan/logger"
	"strings"
	"text/template"
)

const TemplateText = string(`apiVersion: kubeadm.k8s.io/v1beta1
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: {{.Master0}}
  bindPort: 6443
---
apiVersion: kubeadm.k8s.io/v1beta1
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
mode: "ipvs"
ipvs:
  excludeCIDRs: 
  - "{{.VIP}}/32"`)

const JoinCPTemplateText = string(`apiVersion: kubeadm.k8s.io/v1beta2
caCertPath: /etc/kubernetes/pki/ca.crt
discovery:
  bootstrapToken: 
    apiServerEndpoint: {{.Master0}}:6443
    token: {{.TokenDiscovery}}
    caCertHashes: 
    - {{.TokenDiscoveryCAHash}}
  timeout: 5m0s
kind: JoinConfiguration
controlPlane:
  localAPIEndpoint:
    advertiseAddress: {{.Master}}
    bindPort: 6443`)

var ConfigType string

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

func joinKubeadmConfig() string  {
	var sb strings.Builder
	sb.Write([]byte(JoinCPTemplateText))
	return sb.String()
}

func printlnJoinKubeadmConfig()  {
	fmt.Println(joinKubeadmConfig())
}

func kubeadmConfig() string {
	var sb strings.Builder
	sb.Write([]byte(TemplateText))
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
func JoinTemplate(ip string) []byte {
	return JoinTemplateFromTemplateContent(joinKubeadmConfig(), ip)
}

func JoinTemplateFromTemplateContent(templateContent, ip string) []byte {
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
	envMap["Master0"] = IpFormat(MasterIPs[0])
	envMap["Master"] = IpFormat(ip)
	envMap["TokenDiscovery"] = JoinToken
	envMap["TokenDiscoveryCAHash"] = TokenCaCertHash
	var buffer bytes.Buffer
	_ = tmpl.Execute(&buffer, envMap)
	return buffer.Bytes()
}

func TemplateFromTemplateContent(templateContent string) []byte {
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
	getmasters := MasterIPs
	for _, h := range getmasters {
		masters = append(masters, IpFormat(h))
	}
	var envMap = make(map[string]interface{})
	envMap["CertSANS"] = CertSANS
	envMap["VIP"] = VIP
	envMap["Masters"] = masters
	envMap["Version"] = Version
	envMap["ApiServer"] = ApiServer
	envMap["PodCIDR"] = PodCIDR
	envMap["SvcCIDR"] = SvcCIDR
	envMap["Repo"] = Repo
	envMap["Master0"] = IpFormat(MasterIPs[0])
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
						if kubeadm.Networking.DnsDomain == "" {
							kubeadm.Networking.DnsDomain = "cluster.local"
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
	ApiServer struct {
		CertSANs []string `yaml:"certSANs,omitempty"`
	} `yaml:"apiServer"`
	Networking struct {
		DnsDomain string `yaml:"dnsDomain,omitempty"`
	} `yaml:"networking"`
}
