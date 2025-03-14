// Copyright © 2025 sealos.
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

package toml_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/labring/sealos/pkg/utils/toml"
)

type TestConfig struct {
	Name    string
	Version string
	Numbers []int
}

func TestMarshalFile(t *testing.T) {
	testCases := []struct {
		name    string
		obj     interface{}
		wantErr bool
	}{
		{
			name: "valid config",
			obj: TestConfig{
				Name:    "test",
				Version: "1.0.0",
				Numbers: []int{1, 2, 3},
			},
			wantErr: false,
		},
		{
			name:    "nil object",
			obj:     nil,
			wantErr: true,
		},
	}

	tempDir := t.TempDir()

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			filePath := filepath.Join(tempDir, "test.toml")
			err := toml.MarshalFile(filePath, tc.obj)
			if tc.wantErr {
				assert.Error(t, err, "Expected error but got none")
			} else {
				assert.NoError(t, err, "Unexpected error occurred")
				_, err := os.Stat(filePath)
				assert.False(t, os.IsNotExist(err), "File was not created")
			}
		})
	}
}

func TestUnmarshalFile(t *testing.T) {
	testCases := []struct {
		name    string
		input   string
		wantObj TestConfig
		wantErr bool
	}{
		{
			name: "valid config",
			input: `Name = "test"
Version = "1.0.0"
Numbers = [1, 2, 3]`,
			wantObj: TestConfig{
				Name:    "test",
				Version: "1.0.0",
				Numbers: []int{1, 2, 3},
			},
			wantErr: false,
		},
		{
			name:    "invalid file path",
			input:   "",
			wantObj: TestConfig{},
			wantErr: true,
		},
		{
			name: "invalid toml format",
			input: `Name = test
Invalid = `,
			wantObj: TestConfig{},
			wantErr: true,
		},
	}

	tempDir := t.TempDir()

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			filePath := filepath.Join(tempDir, "test.toml")

			if tc.input != "" {
				err := os.WriteFile(filePath, []byte(tc.input), 0644)
				assert.NoError(t, err, "Failed to write test file")
			} else {
				// Ensure the file does not exist for invalid file path case
				os.Remove(filePath)
			}

			var got TestConfig
			err := toml.UnmarshalFile(filePath, &got)
			if tc.wantErr {
				assert.Error(t, err, "Expected error but got none")
			} else {
				assert.NoError(t, err, "Unexpected error occurred")
				assert.Equal(t, tc.wantObj.Name, got.Name, "Name mismatch")
				assert.Equal(t, tc.wantObj.Version, got.Version, "Version mismatch")
				assert.Equal(t, tc.wantObj.Numbers, got.Numbers, "Numbers mismatch")
			}
		})
	}
}
