package install

import (
	"github.com/fanux/sealos/v3/pkg/sshcmd/sshutil"
	"reflect"
	"testing"
)

func Test_generatorKubeadmConfig(t *testing.T) {
	kubeadmConfig()
}

func TestTemplate(t *testing.T) {
	var masters = []string{"172.20.241.205", "172.20.241.206", "172.20.241.207"}
	var vip = "10.103.97.1"
	config := sshutil.SSH{
		User:     "cuisongliu",
		Password: "admin",
	}
	MasterIPs = masters
	VIP = vip
	config.Cmd("127.0.0.1", "echo \""+string(Template())+"\" > ~/aa")
	t.Log(string(Template()))
}

var testYaml = `apiVersion: kubeadm.k8s.io/v1beta1
kind: ClusterConfiguration
kubernetesVersion: v1.18.0
controlPlaneEndpoint: apiserver.cluster.local:6443
imageRepository: k8s.gcr.io
networking:
  # dnsDomain: cluster.local
  podSubnet: 100.64.0.0/10
  serviceSubnet: 10.96.0.0/12
apiServer:
  certSANs:
  - 127.0.0.1
  - apiserver.cluster.local
  - 172.16.9.202
  - 172.16.9.200
  - 172.16.9.201
  - 10.103.97.2
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
mode: ipvs
ipvs:
  excludeCIDRs: 
  - 10.103.97.2/32
`

func TestKubeadmDataFromYaml(t *testing.T) {
	type args struct {
		context string
	}
	tests := []struct {
		name string
		args args
		want *KubeadmType
	}{
		{
			"test decode yaml altnames",
			args{testYaml},
			&KubeadmType{
				Kind: "ClusterConfiguration",
				ApiServer: struct {
					CertSANs []string `yaml:"certSANs,omitempty"`
				}{},
				Networking: struct {
					DnsDomain string `yaml:"dnsDomain,omitempty"`
				}{},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := KubeadmDataFromYaml(tt.args.context)
			if !reflect.DeepEqual(got.ApiServer.CertSANs, []string{"127.0.0.1", "apiserver.cluster.local", "172.16.9.202", "172.16.9.200", "172.16.9.201", "10.103.97.2"}) {
				t.Errorf("%v", got)
			}
		})
	}
}
