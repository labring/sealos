// Copyright © 2022 sealos.
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
