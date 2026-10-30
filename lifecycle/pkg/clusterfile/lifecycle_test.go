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

package clusterfile

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/labring/sealos/pkg/constants"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

func TestCheckLifecycleGuardsStaleJournal(t *testing.T) {
	ctx := context.Background()
	client := fake.NewSimpleClientset()
	if err := CheckLifecycle(ctx, client); err != nil {
		t.Fatalf("clean cluster blocked: %v", err)
	}
	client = fake.NewSimpleClientset(&v1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      LifecycleResource,
			Namespace: "kube-system",
		},
	})
	if err := CheckLifecycle(ctx, client); err == nil {
		t.Fatal("stale journal was not reported")
	}
}

func TestDiscardLifecycleJournalRemovesStaleFile(t *testing.T) {
	previousRoot := constants.DefaultRuntimeRootDir
	constants.DefaultRuntimeRootDir = t.TempDir()
	t.Cleanup(func() {
		constants.DefaultRuntimeRootDir = previousRoot
	})
	name := "discard-test"
	dir := constants.ClusterDir(name)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(dir, LifecycleFilename)
	if err := os.WriteFile(path, []byte("{}"), 0o600); err != nil {
		t.Fatal(err)
	}
	DiscardLifecycleJournal(context.Background(), name)
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("stale journal survived: %v", err)
	}
	// A missing journal must stay a no-op.
	DiscardLifecycleJournal(context.Background(), name)
}
