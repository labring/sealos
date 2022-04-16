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

package checker

import (
	"testing"
)

func TestGenerateAll(t *testing.T) {
	checker := &ClusterChecker{}
	var data []ClusterStatus
	data = append(data, ClusterStatus{
		IP:                    "1.1.1.1",
		Node:                  "test1",
		KubeAPIServer:         "Running",
		KubeControllerManager: "Running",
		KubeScheduler:         "Running",
		KubeletErr:            "<nil>",
	})
	data = append(data, ClusterStatus{
		IP:                    "2.2.2.2",
		Node:                  "test2",
		KubeAPIServer:         "Running",
		KubeControllerManager: "Running",
		KubeScheduler:         "Running",
		KubeletErr:            "[kubelet-check] It seems like the kubelet isn't running or healthy.",
	})
	if err := checker.Output(data); err != nil {
		t.Error(err)
	}
}
