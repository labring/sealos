package install

import (
	"bytes"
	"fmt"
	"github.com/wonderivan/logger"
	"sigs.k8s.io/yaml"
	"strings"
	"text/template"
)

var ConfigType string

func setKubeadmApi(version string) {
	major, _ := GetMajorMinorInt(version)
	switch {
	//
	case major < 120:
		KubeadmApi = KubeadmV1beta1
		CriSocket = DefaultDockerCRISocket
	case major < 123 && major >= 120:
		KubeadmApi = KubeadmV1beta2
		CriSocket = DefaultContainerdCRISocket
	case major >= 123:
		KubeadmApi = KubeadmV1beta3
		CriSocket = DefaultContainerdCRISocket
		BootstrapApi = Bootstraptokenv1
	default:
		KubeadmApi = KubeadmV1beta3
		CriSocket = DefaultContainerdCRISocket
		BootstrapApi = Bootstraptokenv1
	}
	logger.Debug("KubeadmApi: %s", KubeadmApi)
	logger.Debug("CriSocket: %s", CriSocket)
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
	setKubeadmApi(Version)
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
	envMap["Master"] = ip
	envMap["TokenDiscovery"] = JoinToken
	envMap["TokenDiscoveryCAHash"] = TokenCaCertHash
	envMap["VIP"] = VIP
	envMap["KubeadmApi"] = KubeadmApi
	envMap["CriSocket"] = CriSocket
	envMap["CgroupDriver"] = cgroup
	var buffer bytes.Buffer
	_ = tmpl.Execute(&buffer, envMap)
	return buffer.Bytes()
}

func TemplateFromTemplateContent(templateContent string) []byte {
	setKubeadmApi(Version)
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
	envMap["Network"] = Network
	envMap["CgroupDriver"] = CgroupDriver
	envMap["KubeadmApi"] = KubeadmApi
	envMap["CriSocket"] = CriSocket
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
