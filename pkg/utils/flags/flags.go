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
	"strings"

	"github.com/spf13/pflag"

	"github.com/labring/sealos/pkg/utils/logger"
)

// PrintFlags logs the flags in the flagset
func PrintFlags(flags *pflag.FlagSet) {
	flags.VisitAll(func(flag *pflag.Flag) {
		logger.Debug("FLAG: --%s=%q", flag.Name, flag.Value)
	})
}

// SetFlagsFromEnv set value of flag if not changed but has env key
func SetFlagsFromEnv(prefix string, flags *pflag.FlagSet) {
	if prefix != "" && !strings.HasSuffix(prefix, "_") {
		prefix += "_"
	}
	flags.VisitAll(func(flag *pflag.Flag) {
		if flag.Changed {
			return
		}
		envVar := strings.ToUpper(strings.Replace(prefix+flag.Name, "-", "_", -1))
		if v := os.Getenv(envVar); v != "" {
			_ = flags.Set(flag.Name, v)
		}
	})
}
