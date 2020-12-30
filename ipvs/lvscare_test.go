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
    - 116.31.96.134:6443
    - --rs
    - 116.31.96.135:6443
    - --rs
    - 116.31.96.136:6443
    command:
    - /usr/bin/lvscare
    image: fanux/lvscare:latest
    imagePullPolicy: IfNotPresent
    name: kube-sealyun-lvscare
    resources: {}
    securityContext:
      privileged: true
    volumeMounts:
    - mountPath: /lib/modules
      name: lib-modules
      readOnly: true
  hostNetwork: true
  priorityClassName: system-cluster-critical
  volumes:
  - hostPath:
      path: /lib/modules
      type: ""
    name: lib-modules
status: {}
`,
}

func TestLvsStaticPodYaml(t *testing.T) {
	type args struct {
		vip     string
		masters []string
		image   LvscareImage
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
				[]string{"116.31.96.134:6443", "116.31.96.135:6443", "116.31.96.136:6443"},
				LvscareImage{"fanux/lvscare", "latest"},
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
