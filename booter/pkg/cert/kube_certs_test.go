// Copyright © 2021 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package cert

import (
	"testing"
)

func TestGenerateAll(t *testing.T) {
	BasePath := "/tmp/kubernetes/pki"
	EtcdBasePath := "/tmp/kubernetes/pki/etcd"
	tests := []struct {
		name    string
		wantErr bool
	}{
		{
			"generate all certs",
			false,
		},
	}
	certMeta, err := NewSealosCertMetaData(BasePath, EtcdBasePath, []string{"test.com", "192.168.1.2", "kubernetes.default.svc.sealos"}, "10.64.0.0/10", "master1", "172.27.139.11", "cluster.local")
	if err != nil {
		t.Error(err)
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := certMeta.GenerateAll(); (err != nil) != tt.wantErr {
				t.Errorf("GenerateAll() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
