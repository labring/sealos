/*
Copyright 2026 sealos.

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

package sync

import (
	"testing"

	"github.com/containers/image/v5/types"
	dtype "github.com/docker/docker/api/types/registry"
)

func TestImageNameToReferenceClearsStaleDockerAuthConfig(t *testing.T) {
	sys := &types.SystemContext{}
	auths := map[string]dtype.AuthConfig{
		"ghcr.io": {
			Username: "user",
			Password: "token",
		},
	}

	if _, err := ImageNameToReference(sys, "ghcr.io/example/private:latest", auths); err != nil {
		t.Fatalf("first reference parse failed: %v", err)
	}
	if sys.DockerAuthConfig == nil {
		t.Fatal("expected docker auth config to be set for authenticated registry")
	}
	if sys.DockerAuthConfig.Username != "user" {
		t.Fatalf("docker auth username = %q, want %q", sys.DockerAuthConfig.Username, "user")
	}

	if _, err := ImageNameToReference(sys, "gcr.io/kubebuilder/kube-rbac-proxy:v0.14.1", auths); err != nil {
		t.Fatalf("second reference parse failed: %v", err)
	}
	if sys.DockerAuthConfig != nil {
		t.Fatalf("expected docker auth config to be cleared for public registry, got %#v", sys.DockerAuthConfig)
	}
}
