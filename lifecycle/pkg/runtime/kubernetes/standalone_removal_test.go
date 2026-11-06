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
	"context"
	"testing"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	clienttesting "k8s.io/client-go/testing"
)

func TestStandaloneRemovalDeletesConvertedNode(t *testing.T) {
	runtime, client, execer := workerFixture(v2.ControlPlaneModeStandalone)
	nodes := client.CoreV1().Nodes()
	ctx := context.Background()
	node, err := nodes.Get(ctx, "worker", metav1.GetOptions{})
	if err != nil {
		t.Fatal(err)
	}
	node.Labels = map[string]string{"node-role.kubernetes.io/control-plane": ""}
	if _, err := nodes.Update(ctx, node, metav1.UpdateOptions{}); err != nil {
		t.Fatal(err)
	}
	if err := runtime.removeStandaloneMaster("192.0.2.2", "standalone reset"); err != nil {
		t.Fatal(err)
	}
	if _, err := nodes.Get(ctx, node.Name, metav1.GetOptions{}); !apierrors.IsNotFound(err) {
		t.Fatalf("converted Node remains after removal: %v", err)
	}
	for _, action := range client.Actions() {
		if deletion, ok := action.(clienttesting.DeleteAction); ok {
			preconditions := deletion.GetDeleteOptions().Preconditions
			if preconditions == nil || preconditions.UID == nil || *preconditions.UID != node.UID {
				t.Fatal("Node removal does not protect against identity replacement")
			}
		}
	}
	if err := runtime.removeStandaloneMaster("192.0.2.2", "standalone reset"); err != nil {
		t.Fatalf("removal retry rejected an absent Node: %v", err)
	}
	if len(execer.commands) != 2 {
		t.Fatalf("expected reset on both attempts, got %v", execer.commands)
	}
}

func TestStandaloneRemovalPreservesNodeOnFailure(t *testing.T) {
	for _, failure := range []string{"identity", "reset"} {
		t.Run(failure, func(t *testing.T) {
			runtime, client, execer := workerFixture(v2.ControlPlaneModeStandalone)
			if failure == "identity" {
				execer.hostname = "another-host"
			} else {
				execer.fail = "standalone reset"
			}
			if err := runtime.removeStandaloneMaster("192.0.2.2", "standalone reset"); err == nil {
				t.Fatal("expected removal failure")
			}
			_, err := client.CoreV1().Nodes().Get(
				context.Background(),
				"worker",
				metav1.GetOptions{},
			)
			if err != nil {
				t.Fatalf("removed Node despite failure: %v", err)
			}
			if failure == "identity" && len(execer.commands) != 0 {
				t.Fatal("reset host before verifying its identity")
			}
		})
	}
}
