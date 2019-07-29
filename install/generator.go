package install

import (
	"github.com/wonderivan/logger"
	"io/ioutil"
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

var GeneratorType string

func Generator() {
	switch GeneratorType {
	case "kubeadm-config":
		generatorKubeadmConfig()
	default:
		generatorKubeadmConfig()
	}
}

func generatorKubeadmConfig() {
	const fileName = "kubeadm-config.yaml"
	data := []byte(TemplateText)
	if ioutil.WriteFile(fileName, data, 0755) == nil {
		logger.Info("generator kubeadm-config.yaml success.")
		logger.Info("\n" + TemplateText)
	}
}
