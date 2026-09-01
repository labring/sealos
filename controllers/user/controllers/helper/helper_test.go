// Copyright 2026 labring.
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

package helper

import (
	"testing"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	corev1 "k8s.io/api/core/v1"
)

func TestGetConditionReturnsIndependentCopyWhenMissing(t *testing.T) {
	t.Parallel()
	desired := &userv1.Condition{Type: userv1.Ready, Status: corev1.ConditionTrue}
	got := GetCondition(nil, desired)
	got.Status = corev1.ConditionFalse
	if desired.Status != corev1.ConditionTrue {
		t.Fatal("missing condition result aliases the desired condition")
	}
}

func TestDeleteConditionKeepsOriginalSliceWhenUnchanged(t *testing.T) {
	t.Parallel()
	conditions := []userv1.Condition{{Type: userv1.Ready}}
	got := DeleteCondition(conditions, userv1.Initialized)
	if len(got) != len(conditions) || &got[0] != &conditions[0] {
		t.Fatal("DeleteCondition allocated or changed a slice without a matching condition")
	}
}

func TestDeleteConditionRemovesAllMatchingConditions(t *testing.T) {
	t.Parallel()
	conditions := []userv1.Condition{
		{Type: userv1.Ready},
		{Type: userv1.Initialized},
		{Type: userv1.Initialized},
	}
	got := DeleteCondition(conditions, userv1.Initialized)
	if len(got) != 1 || got[0].Type != userv1.Ready {
		t.Fatalf("remaining conditions = %#v, want only Ready", got)
	}
}
