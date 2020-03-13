package ipvs

import (
	"testing"
)

var want = []string{
	`apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  labels:
    component: kube-sealyun-lvscare
    tier: control-plane
  name: kube-sealyun-lvscare
  namespace: kube-system
spec:
  containers:
  - args:
    - care
    - --vs
    - 10.10.10.10:6443
    - --health-path
    - /healthz
    - --health-schem
    - https
    - --rs
    - 192.168.0.2:6443
    - --rs
    - 192.168.0.4:6443
    - --rs
    - 192.168.0.3:6443
    command:
    - /usr/bin/lvscare
    image: fanux/lvscare:latest
    imagePullPolicy: IfNotPresent
    name: kube-sealyun-lvscare
    resources: {}
    securityContext:
      privileged: true
  hostNetwork: true
  priorityClassName: system-cluster-critical
status: {}
`,
}

func TestLvsStaticPodYaml(t *testing.T) {
	type args struct {
		vip     string
		masters []string
		image   string
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
		"test generate lvscare static pod",
		args{
			"10.10.10.10",
			[]string{"192.168.0.2","192.168.0.4","192.168.0.3"},
			"",
		},
		want[0],
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := LvsStaticPodYaml(tt.args.vip, tt.args.masters, tt.args.image); got != tt.want {
				t.Errorf("LvsStaticPodYaml() = %v, want %v", got, tt.want)
			}
		})
	}
}