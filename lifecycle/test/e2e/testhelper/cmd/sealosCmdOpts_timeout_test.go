// Copyright © 2024 sealos.
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

package cmd

import (
	"testing"

	"github.com/labring/sealos/pkg/types/v1beta1"
)

func TestRunOptions_WithExecutionTimeout(t *testing.T) {
	tests := []struct {
		name              string
		opts              *RunOptions
		expectedContains  []string
		notExpectedContains []string
	}{
		{
			name: "with execution timeout 600s",
			opts: &RunOptions{
				Cluster:          "default",
				Masters:          []string{"192.168.1.1"},
				Images:           []string{"nginx:latest"},
				ExecutionTimeout: "600s",
				MaxRetry:         5,
			},
			expectedContains: []string{
				"--cluster", "default",
				"--masters", "192.168.1.1",
				"--execution-timeout", "600s",
				"--max-retry", "5",
				"nginx:latest",
			},
		},
		{
			name: "with execution timeout 1h",
			opts: &RunOptions{
				Cluster:          "test",
				Masters:          []string{"192.168.1.2"},
				Images:           []string{"labring/kubernetes:v1.25.0"},
				ExecutionTimeout: "1h",
				MaxRetry:         10,
			},
			expectedContains: []string{
				"--cluster", "test",
				"--execution-timeout", "1h",
				"--max-retry", "10",
			},
		},
		{
			name: "with zero timeout (unlimited)",
			opts: &RunOptions{
				Cluster:          "unlimited",
				Masters:          []string{"192.168.1.3"},
				Images:           []string{"nginx:latest"},
				ExecutionTimeout: "0",
			},
			expectedContains: []string{
				"--execution-timeout", "0",
			},
		},
		{
			name: "without execution timeout",
			opts: &RunOptions{
				Cluster: "default",
				Masters: []string{"192.168.1.1"},
				Images:  []string{"nginx:latest"},
			},
			notExpectedContains: []string{
				"--execution-timeout",
				"--max-retry",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			args := tt.opts.Args()

			// Check expected strings are present
			for _, expected := range tt.expectedContains {
				found := false
				for _, arg := range args {
					if arg == expected {
						found = true
						break
					}
				}
				if !found {
					t.Errorf("Expected argument %q not found in args: %v", expected, args)
				}
			}

			// Check not expected strings are absent
			for _, notExpected := range tt.notExpectedContains {
				for _, arg := range args {
					if arg == notExpected {
						t.Errorf("Unexpected argument %q found in args: %v", notExpected, args)
					}
				}
			}
		})
	}
}

func TestRunOptions_WithMaxRetry(t *testing.T) {
	tests := []struct {
		name             string
		opts             *RunOptions
		expectedMaxRetry string
	}{
		{
			name: "max-retry 5",
			opts: &RunOptions{
				Cluster:  "default",
				Masters:  []string{"192.168.1.1"},
				Images:   []string{"nginx:latest"},
				MaxRetry: 5,
			},
			expectedMaxRetry: "5",
		},
		{
			name: "max-retry 10",
			opts: &RunOptions{
				Cluster:  "default",
				Masters:  []string{"192.168.1.1"},
				Images:   []string{"nginx:latest"},
				MaxRetry: 10,
			},
			expectedMaxRetry: "10",
		},
		{
			name: "max-retry 0 (no retry)",
			opts: &RunOptions{
				Cluster:  "default",
				Masters:  []string{"192.168.1.1"},
				Images:   []string{"nginx:latest"},
				MaxRetry: 0,
			},
			expectedMaxRetry: "0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			args := tt.opts.Args()

			// Find --max-retry argument
			found := false
			for i, arg := range args {
				if arg == "--max-retry" && i+1 < len(args) {
					if args[i+1] == tt.expectedMaxRetry {
						found = true
						break
					}
				}
			}

			if !found && tt.opts.MaxRetry != 0 {
				t.Errorf("Expected --max-retry %s not found in args: %v", tt.expectedMaxRetry, args)
			}
		})
	}
}

func TestApplyOptions_WithExecutionTimeout(t *testing.T) {
	tests := []struct {
		name             string
		opts             *ApplyOptions
		expectedContains []string
	}{
		{
			name: "apply with execution timeout",
			opts: &ApplyOptions{
				Clusterfile:      "Clusterfile",
				ExecutionTimeout: "600s",
			},
			expectedContains: []string{
				"-f", "Clusterfile",
				"--execution-timeout", "600s",
			},
		},
		{
			name: "apply without execution timeout",
			opts: &ApplyOptions{
				Clusterfile: "Clusterfile",
			},
			expectedContains: []string{
				"-f", "Clusterfile",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			args := tt.opts.Args()

			// Check expected strings are present
			for _, expected := range tt.expectedContains {
				found := false
				for _, arg := range args {
					if arg == expected {
						found = true
						break
					}
				}
				if !found {
					t.Errorf("Expected argument %q not found in args: %v", expected, args)
				}
			}
		})
	}
}

func TestRunOptions_WithSSH(t *testing.T) {
	ssh := &v1beta1.SSH{
		User:     "root",
		Passwd:   "password",
		Pk:       "/path/to/key",
		PkPasswd: "keypass",
		Port:     2222,
	}

	opts := &RunOptions{
		Cluster:          "default",
		Masters:          []string{"192.168.1.1"},
		Images:           []string{"nginx:latest"},
		SSH:              ssh,
		ExecutionTimeout: "300s",
		MaxRetry:         5,
	}

	args := opts.Args()

	expectedArgs := map[string]string{
		"--user":       "root",
		"--passwd":     "password",
		"--pk":         "/path/to/key",
		"--pk-passwd":  "keypass",
		"--port":       "2222",
		"--execution-timeout": "300s",
		"--max-retry":  "5",
	}

	for key, value := range expectedArgs {
		found := false
		for i, arg := range args {
			if arg == key && i+1 < len(args) && args[i+1] == value {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Expected %s %s not found in args: %v", key, value, args)
		}
	}
}
