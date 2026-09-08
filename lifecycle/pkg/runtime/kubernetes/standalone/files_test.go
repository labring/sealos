// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

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
