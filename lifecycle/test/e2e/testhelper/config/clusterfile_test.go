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

package config

import (
	"os"
	"testing"

	"github.com/labring/sealos/test/e2e/testdata/kubeadm"

	"github.com/labring/sealos/test/e2e/testhelper/utils"
)

func TestClusterfile_Write(t *testing.T) {
	type fields struct {
		BinData  string
		Replaces map[string]string
	}
	tests := []struct {
		name    string
		fields  fields
		wantErr bool
	}{
		{
			name: "default",
			fields: fields{
				BinData:  kubeadm.PackageName + "/containerd-svc-etcd.yaml",
				Replaces: map[string]string{"127.0.0.1": utils.GetLocalIpv4()},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &Clusterfile{
				BinData:  tt.fields.BinData,
				Replaces: tt.fields.Replaces,
			}
			got, err := c.Write()
			if (err != nil) != tt.wantErr {
				t.Errorf("Write() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			t.Log(got)
			_ = os.RemoveAll(got)
		})
	}
}
