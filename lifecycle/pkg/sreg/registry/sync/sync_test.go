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
