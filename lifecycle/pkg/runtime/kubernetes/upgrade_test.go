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

package kubernetes

import (
	"bytes"
	"strings"
	"testing"
)

func TestSanitizeKubeletConfigForPre130(t *testing.T) {
	kubeletConfig := []byte(`apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
containerRuntimeEndpoint: unix:///run/containerd/containerd.sock
imageMaximumGCAge: 0s
logging:
  format: text
  options:
    json:
      infoBufferSize: "0"
    text:
      infoBufferSize: "0"
`)

	got, err := sanitizeKubeletConfigForVersion(kubeletConfig, "v1.27.1")
	if err != nil {
		t.Fatalf("sanitize kubelet config: %v", err)
	}

	for _, field := range []string{"containerRuntimeEndpoint", "imageMaximumGCAge"} {
		if strings.Contains(string(got), field) {
			t.Fatalf("expected %q to be removed from kubelet config:\n%s", field, got)
		}
	}
	if strings.Contains(string(got), "\n    text:") {
		t.Fatalf("expected logging.options.text to be removed from kubelet config:\n%s", got)
	}
	if !strings.Contains(string(got), "format: text") {
		t.Fatalf("expected logging.format to be preserved:\n%s", got)
	}
	if !strings.Contains(string(got), "json:") {
		t.Fatalf("expected logging.options.json to be preserved:\n%s", got)
	}
}

func TestSanitizeKubeletConfigFor130KeepsFields(t *testing.T) {
	kubeletConfig := []byte(`apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
containerRuntimeEndpoint: unix:///run/containerd/containerd.sock
imageMaximumGCAge: 0s
logging:
  options:
    text:
      infoBufferSize: "0"
`)

	got, err := sanitizeKubeletConfigForVersion(kubeletConfig, "v1.30.0")
	if err != nil {
		t.Fatalf("sanitize kubelet config: %v", err)
	}
	if !bytes.Equal(got, kubeletConfig) {
		t.Fatalf("expected kubelet config for v1.30.0 to be unchanged:\n%s", got)
	}
}
