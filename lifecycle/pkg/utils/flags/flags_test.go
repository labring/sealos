/*
Copyright 2022 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package flags

import (
	"os"
	"testing"

	"github.com/spf13/pflag"
)

func TestPrintFlags(t *testing.T) {
	flags := pflag.NewFlagSet("test", pflag.ContinueOnError)
	flags.String("test-flag", "", "test flag")
	_ = flags.Set("test-flag", "test-value")

	// Just call to ensure no panic
	PrintFlags(flags)
}

func TestSetFlagsFromEnv(t *testing.T) {
	tests := []struct {
		name     string
		prefix   string
		envKey   string
		envVal   string
		flagName string
		want     string
	}{
		{
			name:     "no prefix",
			prefix:   "",
			envKey:   "TEST_FLAG",
			envVal:   "test-val",
			flagName: "test-flag",
			want:     "test-val",
		},
		{
			name:     "with prefix",
			prefix:   "PREFIX",
			envKey:   "PREFIX_TEST_FLAG",
			envVal:   "prefix-val",
			flagName: "test-flag",
			want:     "prefix-val",
		},
		{
			name:     "with prefix and underscore",
			prefix:   "PREFIX_",
			envKey:   "PREFIX_TEST_FLAG",
			envVal:   "prefix-underscore-val",
			flagName: "test-flag",
			want:     "prefix-underscore-val",
		},
		{
			name:     "flag already set",
			prefix:   "",
			envKey:   "TEST_FLAG",
			envVal:   "env-val",
			flagName: "test-flag",
			want:     "flag-val",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			flags := pflag.NewFlagSet("test", pflag.ContinueOnError)
			flags.String(tt.flagName, "", "test flag")

			if tt.name == "flag already set" {
				_ = flags.Set(tt.flagName, "flag-val")
			}

			os.Setenv(tt.envKey, tt.envVal)
			defer os.Unsetenv(tt.envKey)

			SetFlagsFromEnv(tt.prefix, flags)

			got := flags.Lookup(tt.flagName).Value.String()
			if got != tt.want {
				t.Errorf("SetFlagsFromEnv() got = %v, want %v", got, tt.want)
			}
		})
	}
}
