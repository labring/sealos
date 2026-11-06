/*
Copyright © 2026 sealos.

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

package decode

import (
	"testing"

	kubelet "k8s.io/kubelet/config/v1beta1"
)

// Regression test: the kubelet defaults helper panics on feature gates that
// the vendored kubelet registry no longer knows about, so defaulting must drop
// them first.
func TestDefaultDropsRemovedKubeletFeatureGates(t *testing.T) {
	const config = `apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
featureGates:
  EphemeralContainers: true
  TTLAfterFinished: true`

	ret, err := CRDFromString(config, KubeletConfiguration)
	if err != nil {
		t.Fatalf("decode KubeletConfiguration failed: %v", err)
	}
	obj, ok := ret.(*kubelet.KubeletConfiguration)
	if !ok {
		t.Fatalf("unexpected type %T", ret)
	}

	Default(obj)

	for gate := range obj.FeatureGates {
		for _, removed := range removedKubeletFeatureGates {
			if gate == removed {
				t.Errorf("feature gate %s should have been dropped", gate)
			}
		}
	}
}
