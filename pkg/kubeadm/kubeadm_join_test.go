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

import (
	"testing"

	"github.com/fanux/sealos/pkg/token"
)

func Test_join_DefaultConfig(t *testing.T) {
	type fields struct {
		KubeadmAPIVersion string
		Master0           string
		MasterIP          string
		CriSocket         string
		VIP               string
		Token             token.Token
	}
	tests := []struct {
		name    string
		fields  fields
		wantErr bool
	}{
		{
			name: "default",
			fields: fields{
				KubeadmAPIVersion: "v1.22.0",
				Master0:           "1.1.1.1",
				//MasterIP:          "2.2.2.2",
				CriSocket: "/xxxx/cri",
				VIP:       "10.97.2.1",
				Token: token.Token{
					JoinToken:                "xxxx",
					DiscoveryTokenCaCertHash: []string{"aa", "bb"},
					CertificateKey:           "cc",
				},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &join{
				KubeadmAPIVersion: tt.fields.KubeadmAPIVersion,
				Master0:           tt.fields.Master0,
				MasterIP:          tt.fields.MasterIP,
				CriSocket:         tt.fields.CriSocket,
				VIP:               tt.fields.VIP,
				Token:             tt.fields.Token,
			}
			got, err := c.DefaultConfig()
			if (err != nil) != tt.wantErr {
				t.Errorf("DefaultConfig() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			t.Log(got)
		})
	}
}
