// Copyright © 2025 sealos.
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

package passwd_test

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"

	"github.com/labring/sealos/pkg/utils/passwd"
)

func TestHtpasswd(t *testing.T) {
	tests := []struct {
		name     string
		username string
		password string
		want     string
	}{
		{
			name:     "normal case",
			username: "test",
			password: "password123",
			want:     "test:",
		},
		{
			name:     "empty username",
			username: "",
			password: "password123",
			want:     ":",
		},
		{
			name:     "empty password",
			username: "test",
			password: "",
			want:     "test:",
		},
		{
			name:     "both empty",
			username: "",
			password: "",
			want:     ":",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := passwd.Htpasswd(tt.username, tt.password)
			assert.True(t, strings.HasPrefix(got, tt.want), "Htpasswd() = %v, want prefix %v", got, tt.want)

			if tt.password != "" {
				parts := strings.Split(got, ":")
				assert.Equal(t, 2, len(parts), "Invalid format - expected username:hash")
				if len(parts) == 2 {
					hash := []byte(parts[1])
					err := bcrypt.CompareHashAndPassword(hash, []byte(tt.password))
					assert.NoError(t, err, "Generated hash does not match password: %v", err)
				}
			}
		})
	}
}

func TestLoginAuth(t *testing.T) {
	tests := []struct {
		name     string
		username string
		password string
		want     string
	}{
		{
			name:     "normal case",
			username: "test",
			password: "pass",
			want:     "dGVzdDpwYXNz", // base64 of "test:pass"
		},
		{
			name:     "empty username",
			username: "",
			password: "pass",
			want:     "OnBhc3M=", // base64 of ":pass"
		},
		{
			name:     "empty password",
			username: "test",
			password: "",
			want:     "dGVzdDo=", // base64 of "test:"
		},
		{
			name:     "both empty",
			username: "",
			password: "",
			want:     "Og==", // base64 of ":"
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := passwd.LoginAuth(tt.username, tt.password)
			assert.Equal(t, tt.want, got, "LoginAuth() = %v, want %v", got, tt.want)
		})
	}
}

func TestLoginAuthDecode(t *testing.T) {
	tests := []struct {
		name    string
		auth    string
		want    string
		wantErr bool
	}{
		{
			name:    "valid auth",
			auth:    "dGVzdDpwYXNz", // base64 of "test:pass"
			want:    "test:pass",
			wantErr: false,
		},
		{
			name:    "empty string",
			auth:    "",
			want:    "",
			wantErr: false,
		},
		{
			name:    "padded base64",
			auth:    "Og==", // base64 of ":"
			want:    ":",
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := passwd.LoginAuthDecode(tt.auth)
			if tt.wantErr {
				assert.Error(t, err, "LoginAuthDecode() expected error for input: %v", tt.auth)
			} else {
				assert.NoError(t, err, "LoginAuthDecode() unexpected error: %v", err)
				assert.Equal(t, tt.want, got, "LoginAuthDecode() = %v, want %v", got, tt.want)
			}
		})
	}
}
