// Copyright © 2021 sealos.
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

package save

import (
	"context"
	"os"
	"testing"

	v1 "github.com/opencontainers/image-spec/specs-go/v1"

	"github.com/labring/sealos/pkg/registry/crane"
)

func TestSaveImages(t *testing.T) {
	defer func() {
		_ = os.RemoveAll("testdata/registry")
	}()
	t.Setenv("DOCKER_CONFIG", "/Users/cuisongliu/.docker")
	authConfigs, _ := crane.GetAuthInfo(nil)
	save := newDefaultRegistrySaver(context.TODO(), 5, authConfigs)
	t.Run("no credentials found", func(t *testing.T) {
		_ = os.Mkdir("testdata/registry", 0755)
		imgs, err := save.SaveImages([]string{"nginx"}, "testdata/registry", v1.Platform{
			Architecture: "amd64",
		})
		if err != nil {
			t.Error(err)
			return
		}
		t.Logf("images: %+v", imgs)
	})
}

func TestSaveTmpImages(t *testing.T) {
	defer func() {
		_ = os.RemoveAll("testdata/registry")
	}()
	t.Setenv("DOCKER_CONFIG", "/Users/cuisongliu/.docker")
	authConfigs, _ := crane.GetAuthInfo(nil)
	save := newTmpRegistrySaver(context.TODO(), 5, authConfigs)
	t.Run("no credentials found", func(t *testing.T) {
		_ = os.Mkdir("testdata/registry", 0755)
		imgs, err := save.SaveImages([]string{"nginx"}, "testdata/registry", v1.Platform{
			Architecture: "amd64",
			OS:           "linux",
		})
		if err != nil {
			t.Error(err)
			return
		}
		t.Logf("images: %+v", imgs)
	})
}
