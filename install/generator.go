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

import (
	"bytes"
	"fmt"
	"strings"
	"text/template"

	"github.com/fanux/sealos/pkg/logger"
	"sigs.k8s.io/yaml"
)

var ConfigType string

func setKubeadmAPI(version string) {
	major, _ := GetMajorMinorInt(version)
	switch {
	//
	case major < 120:
		KubeadmAPI = KubeadmV1beta1
		CriSocket = DefaultDockerCRISocket
	case major < 123 && major >= 120:
		KubeadmAPI = KubeadmV1beta2
		CriSocket = DefaultContainerdCRISocket
	case major >= 123:
		KubeadmAPI = KubeadmV1beta3
		CriSocket = DefaultContainerdCRISocket
	default:
		KubeadmAPI = KubeadmV1beta3
		CriSocket = DefaultContainerdCRISocket
	}
	logger.Debug("KubeadmApi: %s", KubeadmAPI)
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
	setKubeadmAPI(Version)
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
	envMap["Master0"] = IPFormat(MasterIPs[0])
	envMap["Master"] = ip
	envMap["TokenDiscovery"] = JoinToken
	envMap["TokenDiscoveryCAHash"] = TokenCaCertHash
	envMap["VIP"] = VIP
	envMap["KubeadmApi"] = KubeadmAPI
	envMap["CriSocket"] = CriSocket
	envMap["CgroupDriver"] = cgroup
	var buffer bytes.Buffer
	_ = tmpl.Execute(&buffer, envMap)
	return buffer.Bytes()
}

func TemplateFromTemplateContent(templateContent string) []byte {
	setKubeadmAPI(Version)
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
		masters = append(masters, IPFormat(h))
	}
	var envMap = make(map[string]interface{})
	envMap["CertSANS"] = CertSANS
	envMap["VIP"] = VIP
	envMap["Masters"] = masters
	envMap["Version"] = Version
	envMap["ApiServer"] = APIServer
	envMap["PodCIDR"] = PodCIDR
	envMap["SvcCIDR"] = SvcCIDR
	envMap["Repo"] = Repo
	envMap["Master0"] = IPFormat(MasterIPs[0])
	envMap["Network"] = Network
	envMap["CgroupDriver"] = CgroupDriver
	envMap["KubeadmApi"] = KubeadmAPI
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
