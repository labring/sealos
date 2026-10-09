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

package bootstrap

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/labring/sealos/pkg/exec"
)

type contextExecer struct {
	exec.Interface
	seen context.Context
}

func (e *contextExecer) CmdAsyncWithContext(ctx context.Context, _ string, _ ...string) error {
	e.seen = ctx
	return nil
}

func TestBootstrapCommandUsesMaintenanceDeadline(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Minute)
	defer cancel()
	inner := &contextExecer{}
	execer := &maintenanceExecer{Interface: inner, context: ctx}
	if err := execer.CmdAsync("worker", "cleanup"); err != nil {
		t.Fatal(err)
	}
	if inner.seen != ctx {
		t.Fatal("bootstrap discarded the lifecycle context")
	}
	inner.seen = nil
	cancel()
	if err := execer.CmdAsync("worker", "next step"); !errors.Is(err, context.Canceled) {
		t.Fatalf("continued after cancellation: %v", err)
	}
	if inner.seen != nil {
		t.Fatal("executed a command after losing the maintenance lease")
	}
}
