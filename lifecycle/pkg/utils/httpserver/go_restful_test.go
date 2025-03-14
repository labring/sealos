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

package httpserver

import (
	"net/http"
	"testing"

	restful "github.com/emicklei/go-restful/v3"
)

func TestGetAccessToken(t *testing.T) {
	tests := []struct {
		name       string
		authHeader string
		wantToken  string
	}{
		{
			name:       "valid bearer token",
			authHeader: "Bearer abc123",
			wantToken:  "abc123",
		},
		{
			name:       "no bearer prefix",
			authHeader: "abc123",
			wantToken:  "",
		},
		{
			name:       "empty auth header",
			authHeader: "",
			wantToken:  "",
		},
		{
			name:       "bearer prefix only",
			authHeader: "Bearer ",
			wantToken:  "",
		},
		{
			name:       "case sensitive bearer prefix",
			authHeader: "bearer abc123",
			wantToken:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			httpRequest, _ := http.NewRequest("GET", "/", nil)
			httpRequest.Header.Set("Authorization", tt.authHeader)
			request := restful.NewRequest(httpRequest)

			got := GetAccessToken(request)
			if got != tt.wantToken {
				t.Errorf("GetAccessToken() = %v, want %v", got, tt.wantToken)
			}
		})
	}
}
