/*
Copyright 2022 cuisongliu@qq.com.

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

package kubeadm

import "testing"

func Test_cluster_DefaultConfig(t *testing.T) {
	type fields struct {
		KubeadmAPIVersion string
		KubeVersion       string
		APIServerDomain   string
		PodCIDR           string
		SvcCIDR           string
		CertSANs          []string
	}
	tests := []struct {
		name    string
		fields  fields
		wantErr bool
	}{
		{
			name: "default",
			fields: fields{
				KubeVersion:     "v1.20.0",
				APIServerDomain: "apiserver.cluster.local",
				PodCIDR:         "10.0.1.1",
				SvcCIDR:         "10.0.1.1",
				CertSANs:        []string{"127.0.0.1", "10.97.2.1"},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := NewCluster(tt.fields.KubeVersion, tt.fields.APIServerDomain, tt.fields.PodCIDR, tt.fields.SvcCIDR, tt.fields.CertSANs)

			got, err := c.DefaultConfig()
			if (err != nil) != tt.wantErr {
				t.Errorf("DefaultConfig() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			t.Log(got)
		})
	}
}
