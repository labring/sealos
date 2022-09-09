/*
Copyright 2022 cuisongliu@qq.com.

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

package registry

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	v1 "github.com/opencontainers/image-spec/specs-go/v1"

	"github.com/stretchr/testify/require"
)

func TestGetAuthInfo(t *testing.T) {
	t.Run("no credentials found", func(t *testing.T) {
		authConfigs, err := GetAuthInfo()
		require.NoError(t, err)
		require.Empty(t, authConfigs)
	})
	t.Run("has credentials found", func(t *testing.T) {
		t.Setenv("DOCKER_CONFIG", filepath.Join("testdata"))
		authConfigs, err := GetAuthInfo()
		require.NoError(t, err)
		require.NotEmpty(t, authConfigs)
	})
}

func TestSaveImages(t *testing.T) {
	t.Setenv("DOCKER_CONFIG", filepath.Join("testdata"))
	authConfigs, _ := GetAuthInfo()
	save := NewImageSaver(context.TODO(), 5, authConfigs)
	t.Run("no credentials found", func(t *testing.T) {
		_ = os.Mkdir("testdata/registry", 0755)
		defer os.RemoveAll("testdata/registry")
		imgs, err := save.SaveImages([]string{"192.168.64.27:5000/pause:3.8", "docker.io/library/alpine"}, "testdata/registry", v1.Platform{
			Architecture: "arm64",
		})
		if err != nil {
			t.Error(err)
			return
		}
		t.Logf("images: %+v", imgs)
	})
}
