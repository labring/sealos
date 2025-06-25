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

package checker

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRegistryChecker_Output(t *testing.T) {
	tests := []struct {
		name    string
		status  *RegistryStatus
		wantErr bool
	}{
		{
			name: "normal case",
			status: &RegistryStatus{
				Port:           ":5000",
				DebugPort:      ":5001",
				Storage:        "/var/lib/registry",
				Delete:         true,
				Htpasswd:       "admin:$2y$05$1234",
				RegistryDomain: "localhost:5000",
				Auth:           "admin:password",
				Ping:           "ok",
				Error:          "nil",
			},
			wantErr: false,
		},
		{
			name: "empty status",
			status: &RegistryStatus{
				Port:           "",
				DebugPort:      "",
				Storage:        "",
				Delete:         false,
				Htpasswd:       "",
				RegistryDomain: "",
				Auth:           "",
				Ping:           "",
				Error:          "",
			},
			wantErr: false,
		},
		{
			name:    "nil status",
			status:  nil,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			n := &RegistryChecker{}
			// Capture stdout
			rescueStdout := os.Stdout
			r, w, _ := os.Pipe()
			os.Stdout = w

			err := n.Output(tt.status)

			// Restore stdout
			w.Close()
			os.Stdout = rescueStdout

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				// Read captured output
				outBytes := make([]byte, 1024)
				r.Read(outBytes)
				assert.NotEmpty(t, string(outBytes))
			}
		})
	}
}
