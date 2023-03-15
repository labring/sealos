/*
Copyright 2023 cuisongliu@qq.com.

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

package system

import (
	"fmt"
	"os"
	"path"

	"github.com/containers/buildah"
	"github.com/containers/storage/pkg/homedir"
)

type envSystemConfig struct{}

func Get(key string) (string, error) {
	return globalConfig.getValueOrDefault(key)
}

func Set(key, value string) error {
	return globalConfig.setValue(key, value)
}

var globalConfig *envSystemConfig

func init() {
	globalConfig = &envSystemConfig{}
}

type ConfigOption struct {
	Key           string
	Description   string
	DefaultValue  string
	OSEnv         string
	AllowedValues []string
}

var configOptions = []ConfigOption{
	{
		Key:           PromptConfigKey,
		Description:   "toggle interactive prompting in the terminal.",
		DefaultValue:  "enabled",
		OSEnv:         "SEALOS_PROMPT",
		AllowedValues: []string{"enabled", "disabled"},
	},
	{
		Key:          RuntimeRootConfigKey,
		OSEnv:        "SEALOS_RUNTIME_ROOT",
		Description:  "root directory for sealos actions.",
		DefaultValue: path.Join(homedir.Get(), ".sealos"),
	},
	{
		Key:          DataRootConfigKey,
		Description:  "cluster root directory for remote.",
		DefaultValue: "/var/lib/sealos",
		OSEnv:        "SEALOS_DATA_ROOT",
	},
	{
		Key:          BuildahFormatConfigKey,
		Description:  "`format` of the image manifest and metadata.",
		DefaultValue: buildah.OCI,
		OSEnv:        "BUILDAH_FORMAT",
	},
	{
		Key:           ScpCheckSumConfigKey,
		Description:   "whether to check whether the md5sum value is consistent during the copy process",
		DefaultValue:  "yes",
		OSEnv:         "SEALOS_SCP_CHECKSUM",
		AllowedValues: []string{"true", "false"},
	},
}

const (
	PromptConfigKey        = "prompt"
	RuntimeRootConfigKey   = "sealos_runtime_root"
	DataRootConfigKey      = "sealos_data_root"
	BuildahFormatConfigKey = "buildah_format"
	ScpCheckSumConfigKey   = "scp_check_sum"
)

func (*envSystemConfig) getValueOrDefault(key string) (string, error) {
	for _, option := range configOptions {
		if option.Key == key {
			if option.OSEnv != "" {
				if value, ok := os.LookupEnv(option.OSEnv); ok {
					return value, nil
				}
			}
			return option.DefaultValue, nil
		}
	}
	return "", fmt.Errorf("not found config key %s", key)
}

func (*envSystemConfig) setValue(key, value string) error {
	for _, option := range configOptions {
		if option.Key == key {
			if option.OSEnv == "" {
				return fmt.Errorf("not support set key %s, env not set", key)
			}
			if option.AllowedValues != nil {
				for _, allowedValue := range option.AllowedValues {
					if allowedValue == value {
						return os.Setenv(option.OSEnv, value)
					}
				}
				return fmt.Errorf("value %s is not allowed for key %s", value, key)
			}
		}
	}
	return nil
}

func ConfigOptions() []ConfigOption {
	return configOptions
}
