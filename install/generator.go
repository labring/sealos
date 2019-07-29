package install

import (
	"bytes"
	"fmt"
	"github.com/wonderivan/logger"
	"text/template"
)

const TemplateText = string(`apiVersion: kubeadm.k8s.io/v1beta1
kind: ClusterConfiguration
kubernetesVersion: {{.Version}}
controlPlaneEndpoint: "apiserver.cluster.local:6443"
networking:
  podSubnet: 100.64.0.0/10
apiServer:
        certSANs:
        - 127.0.0.1
        - apiserver.cluster.local
        {{range .Masters -}}
        - {{.}}
        {{end -}}
        - {{.VIP}}
---
apiVersion: kubeproxy.config.k8s.io/v1alpha1
kind: KubeProxyConfiguration
mode: "ipvs"
ipvs:
        excludeCIDRs: 
        - "{{.VIP}}/32"`)

var ConfigType string

func Config() {
	switch ConfigType {
	case "kubeadm":
		kubeadmConfig()
	default:
		kubeadmConfig()
	}
}

func kubeadmConfig() {
	fmt.Print(TemplateText)
}

//Template is
func Template(masters []string, vip string, version string) []byte {
	return TemplateFromTemplateContent(masters, vip, version, TemplateText)
}

func TemplateFromTemplateContent(masters []string, vip, version, templateContent string) []byte {
	tmpl, err := template.New("text").Parse(templateContent)
	if err != nil {
		logger.Error("template parse failed:", err)
		panic(1)
	}
	var envMap = make(map[string]interface{})
	envMap["VIP"] = vip
	envMap["Masters"] = masters
	envMap["Version"] = version
	var buffer bytes.Buffer
	_ = tmpl.Execute(&buffer, envMap)
	return buffer.Bytes()
}
