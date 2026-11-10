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
	"errors"
	"testing"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

func TestCheckPendingModeTransition(t *testing.T) {
	ctx := context.Background()
	if err := CheckPendingModeTransition(ctx, fake.NewSimpleClientset()); err != nil {
		t.Fatalf("clean cluster blocked: %v", err)
	}
	client := fake.NewSimpleClientset(&v1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      ModeTransitionResource,
			Namespace: "kube-system",
		},
	})
	if err := CheckPendingModeTransition(ctx, client); !errors.Is(err, ErrModeTransitionPending) {
		t.Fatalf("pending conversion not reported: %v", err)
	}
}
