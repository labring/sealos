package kube

import (
	"testing"
)

func TestNewK8sClient(t *testing.T) {
	type args struct {
		kubeconfig string
		apiServer  string
	}
	tests := []struct {
		name    string
		args    args
		want    K8s
		wantErr bool
	}{
		// TODO: Add test cases.
		{
			name: "test",
			args: args{
				kubeconfig: "./kube.conf",
				apiServer:  "https://47.96.254.165:6443",
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := NewK8sClient(tt.args.kubeconfig, tt.args.apiServer)
			if (err != nil) != tt.wantErr {
				t.Errorf("NewK8sClient() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			nodeList, err := got.ListNodes()
			if err != nil {
				t.Errorf("ListNodes() error = %v", err)
			}
			t.Logf("ListNodes() got = %v", nodeList)
		})
	}
}
