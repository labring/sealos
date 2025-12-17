/*
Copyright 2024 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://github.com/labring/sealos/blob/main/LICENSE.md

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package server

import (
	"testing"

	"github.com/docker/docker/api/types/registry"
)

func TestReplaceImageSkipLogin(t *testing.T) {
	withManifestStub(t, func(_ *manifestStub) {
		image := "nginx:1.29.2-alpine3.22-perl"
		authConfig := map[string]registry.AuthConfig{
			"docker.xpg666.xyz": {
				ServerAddress: "https://docker.xpg666.xyz",
			},
		}

		newImage, replaced, cfg := replaceImage(image, "PullImage", authConfig)
		if !replaced {
			t.Fatalf("expected image to be replaced when login is skipped")
		}
		if expected := "docker.xpg666.xyz/library/nginx:1.29.2-alpine3.22-perl"; newImage != expected {
			t.Fatalf("expected rewritten image %q, got %q", expected, newImage)
		}
		if cfg == nil {
			t.Fatal("expected auth config to be returned")
		}
	})
}

func TestExtractDomainFromImage(t *testing.T) {
	tests := []struct {
		image    string
		expected string
	}{
		{"nginx:latest", "docker.io"},
		{"docker.io/library/nginx:latest", "docker.io"},
		{"registry.example.com/app/nginx:1.0", "registry.example.com"},
		{"localhost:5000/nginx:1.0", "localhost:5000"},
		{"", ""},
	}

	for _, tt := range tests {
		if domain := extractDomainFromImage(tt.image); domain != tt.expected {
			t.Fatalf("image %q expected domain %q, got %q", tt.image, tt.expected, domain)
		}
	}
}
