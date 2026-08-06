package proxy

import (
	"bytes"
	"strings"
	"testing"

	shimtypes "github.com/labring/image-cri-shim/pkg/types"
)

func TestPrintInfo(t *testing.T) {
	buf := new(bytes.Buffer)
	cfg := &shimtypes.Config{
		Address: "https://registry.example.com",
		Auth:    "user:pass",
		Registries: []shimtypes.Registry{
			{Address: "https://mirror.example.com", Auth: "mirror:auth"},
		},
	}
	if err := PrintInfo(buf, cfg); err != nil {
		t.Fatalf("PrintInfo failed: %v", err)
	}
	output := buf.String()
	for _, want := range []string{"Hub", "Registries", "https://mirror.example.com"} {
		if !strings.Contains(output, want) {
			t.Fatalf("expected output to contain %q, got %q", want, output)
		}
	}
}
