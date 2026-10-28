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

package exec

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/unshare"
)

func TestContextCancelsLocalCommandAndCopy(t *testing.T) {
	t.Setenv(unshare.DisableAutoRootless, "true")
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	client := ssh.WithContext(ctx, &wrap{})
	started := time.Now()
	if _, err := client.Cmd("127.0.0.1", "exec sleep 30"); err == nil {
		t.Fatal("local command ignored cancellation")
	}
	if time.Since(started) > 5*time.Second {
		t.Fatal("local command was not interrupted promptly")
	}
	dir := t.TempDir()
	source, target := filepath.Join(dir, "source"), filepath.Join(dir, "target")
	if err := os.WriteFile(source, []byte("new"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(target, []byte("original"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := client.Copy("127.0.0.1", source, target); !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("copy after cancellation: %v", err)
	}
	data, err := os.ReadFile(target)
	if err != nil || string(data) != "original" {
		t.Fatalf("canceled copy changed the destination: %q, %v", data, err)
	}
}
