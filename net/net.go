package net

import (
	"bytes"
	"strconv"
	"strings"
	"text/template"

	"github.com/wonderivan/logger"
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
	K8sVersion	   string
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


// GetMajorMinorInt
func GetMajorMinorInt(version string) (major, minor int) {
	// alpha beta rc version
	if strings.Contains(version, "-") {
		v := strings.Split(version, "-")[0]
		version = v
	}
	version = strings.Replace(version, "v", "", -1)
	versionArr := strings.Split(version, ".")
	if len(versionArr) >= 2 {
		majorStr := versionArr[0] + versionArr[1]
		minorStr := versionArr[2]
		if major, err := strconv.Atoi(majorStr); err == nil {
			if minor, err := strconv.Atoi(minorStr); err == nil {
				return major, minor
			}
		}
	}
	return 0, 0
}

func For121(version string) bool {
	newMajor, _ := GetMajorMinorInt(version)
	// // kubernetes gt 1.20, use Containerd instead of docker
	if newMajor >= 121 {
		logger.Info("install version is: %s, Use calico v3.19.1 instead", version)
		return true
	} else {
		//logger.Info("install version is: %s, Use kubeadm v1beta1 InitConfig, docker", version)
		return false
	}

}