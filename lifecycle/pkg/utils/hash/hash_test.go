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

package hash

import (
	"crypto/sha256"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDigest(t *testing.T) {
	tests := []struct {
		name     string
		input    []byte
		expected string
	}{
		{
			name:     "empty bytes",
			input:    []byte{},
			expected: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		},
		{
			name:     "simple string",
			input:    []byte("hello"),
			expected: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
		},
		{
			name:     "with special chars",
			input:    []byte("hello!@#$%^&*()"),
			expected: "843bfe5bb70aef0dc3c5c06f5073776fa55f1b00b4352d6f33f6ec1621e83c13",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := Digest(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestFileDigest(t *testing.T) {
	// Create temp test files
	tmpDir := t.TempDir()

	emptyFile := filepath.Join(tmpDir, "empty.txt")
	err := os.WriteFile(emptyFile, []byte{}, 0644)
	assert.NoError(t, err)

	testFile := filepath.Join(tmpDir, "test.txt")
	err = os.WriteFile(testFile, []byte("hello"), 0644)
	assert.NoError(t, err)

	tests := []struct {
		name     string
		path     string
		expected string
	}{
		{
			name:     "empty file",
			path:     emptyFile,
			expected: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		},
		{
			name:     "simple file",
			path:     testFile,
			expected: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
		},
		{
			name:     "non-existent file",
			path:     "non-existent.txt",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := FileDigest(tt.path)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestToString(t *testing.T) {
	type testStruct struct {
		Name string
		Age  int
	}

	tests := []struct {
		name     string
		input    interface{}
		expected string
	}{
		{
			name:     "nil input",
			input:    nil,
			expected: "f390331726b48aeb576a4ca62efcca87b097105d22b4e5d92655c5608d334d75",
		},
		{
			name:     "simple string",
			input:    "test",
			expected: "6efd2430efe9a851609cbbf4c1261e7bd0a7939f55210db40227bbe4d344660c",
		},
		{
			name:     "simple struct",
			input:    testStruct{Name: "test", Age: 20},
			expected: "041d51c167717e8151cbcc905a2c78594fd9e91f9fd674e9eb8164d219c2da09",
		},
		{
			name:     "map input",
			input:    map[string]string{"key": "value"},
			expected: "9ab8b40b8d865845054327ab8029f31846e32308d28989d04e5f3879325624fd",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ToString(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestDeepHashObject(t *testing.T) {
	type testStruct struct {
		Name string
		Age  int
	}

	tests := []struct {
		name  string
		input interface{}
	}{
		{
			name:  "nil input",
			input: nil,
		},
		{
			name:  "simple string",
			input: "test",
		},
		{
			name:  "simple struct",
			input: testStruct{Name: "test", Age: 20},
		},
		{
			name:  "map input",
			input: map[string]string{"key": "value"},
		},
		{
			name:  "nested struct",
			input: struct{ Data testStruct }{Data: testStruct{Name: "test", Age: 20}},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hasher := sha256.New()
			DeepHashObject(hasher, tt.input)
			hash1 := hasher.Sum(nil)

			// Hash again to verify consistency
			hasher.Reset()
			DeepHashObject(hasher, tt.input)
			hash2 := hasher.Sum(nil)

			assert.Equal(t, hash1, hash2, "DeepHashObject should produce consistent hashes")
		})
	}
}
