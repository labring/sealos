package buildah

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"github.com/spf13/pflag"
)

func TestFilterIgnoredImages(t *testing.T) {
	t.Run("filters images listed in sealignore", func(t *testing.T) {
		contextDir := t.TempDir()
		ignoreFile := filepath.Join(contextDir, ".sealignore")
		if err := os.WriteFile(ignoreFile, []byte("docker.io/library/nginx:latest\n"), 0o600); err != nil {
			t.Fatalf("write ignore file: %v", err)
		}

		got, err := filterIgnoredImages(contextDir, []string{
			"docker.io/library/nginx:latest",
			"docker.io/library/busybox:latest",
		})
		if err != nil {
			t.Fatalf("filter ignored images: %v", err)
		}

		want := []string{"docker.io/library/busybox:latest"}
		if !reflect.DeepEqual(got, want) {
			t.Fatalf("filtered images = %v, want %v", got, want)
		}
	})

	t.Run("returns images unchanged when sealignore is absent", func(t *testing.T) {
		contextDir := t.TempDir()
		want := []string{"docker.io/library/busybox:latest"}

		got, err := filterIgnoredImages(contextDir, want)
		if err != nil {
			t.Fatalf("filter ignored images without file: %v", err)
		}
		if !reflect.DeepEqual(got, want) {
			t.Fatalf("filtered images = %v, want %v", got, want)
		}
	})
}

func TestSaverOptionsRegisterFlags(t *testing.T) {
	var opts saverOptions
	fs := pflag.NewFlagSet("test", pflag.ContinueOnError)

	opts.RegisterFlags(fs)

	flag := fs.Lookup("all")
	if flag == nil {
		t.Fatal("expected all flag to be registered")
	}
	if flag.DefValue != "false" {
		t.Fatalf("all flag default = %s, want false", flag.DefValue)
	}
}
