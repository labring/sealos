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

package standalone

import (
	"os"
	"path/filepath"
	"testing"
)

func TestRestorePartialReplacement(t *testing.T) {
	dir := t.TempDir()
	source := filepath.Join(dir, "source")
	original := filepath.Join(dir, "original")
	created := filepath.Join(dir, "created")
	if err := os.WriteFile(source, []byte("new"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(original, []byte("old"), 0o640); err != nil {
		t.Fatal(err)
	}
	files := []replacement{
		{
			Source:      source,
			Destination: original,
			Mode:        0o600,
		},
		{
			Source:      source,
			Destination: created,
			Mode:        0o600,
		},
		{
			Source:      filepath.Join(dir, "missing"),
			Destination: filepath.Join(dir, "last"),
			Mode:        0o600,
		},
	}
	if err := backupReplacements(dir, files); err != nil {
		t.Fatal(err)
	}
	attempted, err := replaceFiles(files)
	if err == nil || attempted != 3 {
		t.Fatalf("expected failure after two replacements: attempted=%d, err=%v", attempted, err)
	}
	if err := restoreFiles(files[:attempted]); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(original)
	if err != nil || string(data) != "old" {
		t.Fatalf("original content was not restored: %q, %v", data, err)
	}
	info, err := os.Stat(original)
	if err != nil || info.Mode().Perm() != 0o640 {
		t.Fatalf("original permissions were not restored: %v", err)
	}
	if _, err := os.Stat(created); !os.IsNotExist(err) {
		t.Fatalf("new file survived recovery: %v", err)
	}
	if err := os.Remove(files[0].Backup); err != nil {
		t.Fatal(err)
	}
	if err := restoreFiles(files[:1]); err == nil {
		t.Fatal("missing backup must report recovery failure")
	}
}
