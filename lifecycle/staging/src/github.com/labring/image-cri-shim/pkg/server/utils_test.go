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
