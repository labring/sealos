/*
Copyright 2023 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package kubernetes

import (
	"context"
	"testing"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/fake"
	ckubeadm "k8s.io/kubernetes/cmd/kubeadm/app/constants"
)

func TestGetKubeadmConfig(t *testing.T) {
	type args struct {
		client kubernetes.Interface
	}
	cli, _ := NewKubernetesClient("", "")
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "default",
			args: args{
				client: cli.Kubernetes(),
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ke := NewKubeExpansion(tt.args.client)
			got, err := ke.FetchKubeadmConfig(context.Background())
			if (err != nil) != tt.wantErr {
				t.Errorf("GetConfig() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			t.Logf("%+v", got)
		})
	}
}

func TestUpdateKubeletConfigUsesConfigMapDataKey(t *testing.T) {
	client := fake.NewSimpleClientset(&v1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      ckubeadm.KubeletBaseConfigurationConfigMap,
			Namespace: metav1.NamespaceSystem,
		},
		Data: map[string]string{
			ckubeadm.KubeletBaseConfigurationConfigMapKey: "old-config",
		},
	})

	const want = "new-config"
	ke := NewKubeExpansion(client)
	if err := ke.UpdateKubeletConfig(context.Background(), want); err != nil {
		t.Fatalf("UpdateKubeletConfig() error = %v", err)
	}

	cm, err := client.CoreV1().ConfigMaps(metav1.NamespaceSystem).Get(context.Background(), ckubeadm.KubeletBaseConfigurationConfigMap, metav1.GetOptions{})
	if err != nil {
		t.Fatalf("get kubelet configmap: %v", err)
	}
	if got := cm.Data[ckubeadm.KubeletBaseConfigurationConfigMapKey]; got != want {
		t.Fatalf("kubelet config key = %q, want %q", got, want)
	}
	if _, ok := cm.Data[ckubeadm.KubeletBaseConfigurationConfigMap]; ok {
		t.Fatalf("unexpected data under configmap name key %q", ckubeadm.KubeletBaseConfigurationConfigMap)
	}
}
