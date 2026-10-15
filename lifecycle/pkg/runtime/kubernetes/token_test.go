// Copyright © 2026 sealos.
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

package kubernetes

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/runtime/kubernetes/types"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type tokenTestPaths struct {
	constants.PathResolver
	dir string
}

func (p tokenTestPaths) EtcPath() string { return p.dir }

func (p tokenTestPaths) RootFSEtcPath() string { return p.dir }

func TestMasterTokenRefreshDoesNotTrustWorkerTokenCache(t *testing.T) {
	for _, inMemory := range []bool{false, true} {
		t.Run(map[bool]string{false: "disk", true: "memory"}[inMemory], func(t *testing.T) {
			dir := t.TempDir()
			token := &types.Token{
				JoinToken:      "abcdef.0123456789abcdef",
				CertificateKey: "cached-key",
				Expires:        &metav1.Time{Time: time.Now().Add(time.Hour)},
			}
			data, err := json.Marshal(token)
			if err != nil {
				t.Fatal(err)
			}
			cached := filepath.Join(dir, defaultKubeadmTokenFileName)
			if err := os.WriteFile(cached, data, 0o600); err != nil {
				t.Fatal(err)
			}
			// An invalid current configuration must stop certificate refresh even
			// when a worker's cached token has not expired.
			config := filepath.Join(dir, defaultRootfsKubeadmFileName)
			if err := os.WriteFile(config, []byte("apiVersion: [invalid"), 0o600); err != nil {
				t.Fatal(err)
			}
			runtime := &KubeadmRuntime{
				config:        &types.Config{},
				kubeadmConfig: types.NewKubeadmConfig(),
				pathResolver:  tokenTestPaths{dir: dir},
			}
			if inMemory {
				runtime.token = token
			}
			if err := runtime.setKubernetesToken(false); err != nil {
				t.Fatalf("worker did not reuse a valid token: %v", err)
			}
			if runtime.kubeadmConfig.JoinConfiguration.ControlPlane.CertificateKey != token.CertificateKey {
				t.Fatal("cached credentials were not applied to the join configuration")
			}
			if err := runtime.setKubernetesToken(true); err == nil ||
				!strings.Contains(err.Error(), "failed to load kubeadm config") {
				t.Fatalf("master reused cached credentials after failed refresh: %v", err)
			}
			after, err := os.ReadFile(cached)
			if err != nil || string(after) != string(data) {
				t.Fatalf("failed refresh replaced the token cache: %v", err)
			}
		})
	}
}
