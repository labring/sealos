// Copyright © 2023 sealos.
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

package aws

import "testing"

func TestKeyPairGC(t *testing.T) {
	tests := []struct {
		name    string
		wantErr bool
	}{
		{
			"test key pair gc",
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cli, _ := NewGarbageCollector()
			if err := cli.KeyPairGC(); (err != nil) != tt.wantErr {
				t.Errorf("KeyPairGC() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestInstanceGC(t *testing.T) {
	tests := []struct {
		name    string
		wantErr bool
	}{
		{
			"test instance gc",
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cli, _ := NewGarbageCollector()
			if err := cli.InstanceGC(); (err != nil) != tt.wantErr {
				t.Errorf("InstanceGC() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
