package net

import (
	"bytes"
	"text/template"
)

const (
	CALICO                = "calico"
	FLANNEL               = "flannel"
	CILIUM                = "cilium"
	defaultInterface      = "eth.*|en.*"
	defaultCIDR           = "100.64.0.0/10"
	defaultK8sServiceHost = "127.0.0.1"
	defaultK8sServicePort = "6443"
)

type MetaData struct {
	Interface string
	CIDR      string
	// ipip mode for calico.yml
	IPIP bool
	// MTU size
	MTU            string
	CniRepo        string
	K8sServiceHost string
	K8sServicePort string
}

// Net is CNI interface
type Net interface {
	// if template is "" using default template
	Manifests(template string) string
	// return cni template file
	Template() string
}

func NewNetwork(t string, metadata MetaData) Net {
	switch t {
	case CALICO:
		return &Calico{metadata: metadata}
	case FLANNEL:
		return &Flannel{metadata: metadata}
	case CILIUM:
		return &Cilium{metadata: metadata}
	default:
		return &Calico{metadata: metadata}
	}
}

func render(data MetaData, temp string) string {
	var b bytes.Buffer
	t := template.Must(template.New("net").Parse(temp))
	t.Execute(&b, &data)
	return b.String()
}
