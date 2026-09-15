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

package controllers

import (
	"testing"
	"time"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestNextKubeConfigRequeueDuration(t *testing.T) {
	t.Parallel()
	if got := nextKubeConfigRequeueDuration(nil, nil); got != 0 {
		t.Fatalf("ordinary requeue duration = %v, want 0", got)
	}

	refreshAt := metav1.NewTime(time.Now().Add(time.Hour))
	user := &userv1.User{Status: userv1.UserStatus{KubeConfigRefreshAt: &refreshAt}}
	if got := nextKubeConfigRequeueDuration(user, nil); got < 59*time.Minute || got > time.Hour {
		t.Fatalf("persisted refresh requeue duration = %v, want about 1h", got)
	}

	expiresAt := metav1.NewTime(time.Now().Add(10 * time.Hour))
	state := &userReconcileState{tokenExpirationDeadline: &expiresAt}
	if got := nextKubeConfigRequeueDuration(
		nil,
		state,
	); got < 7*time.Hour+59*time.Minute ||
		got > 8*time.Hour {
		t.Fatalf("new token refresh requeue duration = %v, want about 8h", got)
	}

	past := metav1.NewTime(time.Now().Add(-time.Minute))
	user.Status.KubeConfigRefreshAt = &past
	if got := nextKubeConfigRequeueDuration(user, nil); got != time.Second {
		t.Fatalf("overdue refresh requeue duration = %v, want 1s", got)
	}
}
