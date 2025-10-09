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
	image := "docker.io/library/nginx:latest"
	authConfig := map[string]registry.AuthConfig{
		"mirror.example.com": {
			ServerAddress: "https://mirror.example.com",
		},
	}
	skip := map[string]bool{"mirror.example.com": true}

	newImage, replaced, cfg := replaceImage(image, "PullImage", authConfig, skip)
	if !replaced {
		t.Fatalf("expected image to be replaced when login is skipped")
	}
	if expected := "mirror.example.com/library/nginx:latest"; newImage != expected {
		t.Fatalf("expected rewritten image %q, got %q", expected, newImage)
	}
	if cfg != nil {
		t.Fatalf("expected no auth config when login is skipped, got %#v", cfg)
	}
}
