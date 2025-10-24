//go:build !linux
// +build !linux

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
	"path/filepath"
)

const (
	PromptConfigKey            = "PROMPT"
	RuntimeRootConfigKey       = "RUNTIME_ROOT"
	DataRootConfigKey          = "DATA_ROOT"
	BuildahFormatConfigKey     = "BUILDAH_FORMAT"
	BuildahLogLevelConfigKey   = "BUILDAH_LOG_LEVEL"
	ContainerStorageConfEnvKey = "CONTAINER_STORAGE_CONF"
	SyncWorkDirEnvKey          = "SYNC_WORKDIR"
)

type ConfigOption struct {
	Key          string
	Description  string
	DefaultValue string
	OSEnv        string
}

type envSystemConfig struct{}

var globalConfig *envSystemConfig

func init() {
	globalConfig = &envSystemConfig{}
}

func Get(key string) (string, error) {
	return "", fmt.Errorf("system functionality is not supported on non-Linux platforms")
}

func GetConfig(key string) (*ConfigOption, error) {
	return nil, fmt.Errorf("system functionality is not supported on non-Linux platforms")
}

func ConfigOptions() []ConfigOption {
	return []ConfigOption{
		{
			Key:          PromptConfigKey,
			Description:  "toggle interactive prompting in the terminal.",
			DefaultValue: "enabled",
		},
		{
			Key:          RuntimeRootConfigKey,
			Description:  "root directory for persistent runtime actions/configs.",
			DefaultValue: filepath.Join(os.TempDir(), "sealos"),
		},
		{
			Key:          DataRootConfigKey,
			Description:  "cluster root directory for remote.",
			DefaultValue: filepath.Join(os.TempDir(), "sealos-data"),
		},
	}
}

func NewEnvSystemConfig() *envSystemConfig {
	return &envSystemConfig{}
}

func (e *envSystemConfig) Init() error {
	return fmt.Errorf("buildah functionality is not supported on non-Linux platforms")
}

func (e *envSystemConfig) GetEnvFile() string {
	return filepath.Join(os.TempDir(), "sealos", "env")
}

func (e *envSystemConfig) GetHostsFile() string {
	return filepath.Join(os.TempDir(), "sealos", "hosts")
}

func (e *envSystemConfig) Parse() (map[string]string, error) {
	return make(map[string]string), fmt.Errorf("buildah functionality is not supported on non-Linux platforms")
}

func (e *envSystemConfig) UpdateEnvFile(env string) error {
	return fmt.Errorf("buildah functionality is not supported on non-Linux platforms")
}

func (e *envSystemConfig) Mount() error {
	return fmt.Errorf("buildah functionality is not supported on non-Linux platforms")
}

func (e *envSystemConfig) Umount() error {
	return fmt.Errorf("buildah functionality is not supported on non-Linux platforms")
}

func (e *envSystemConfig) CopyEnvToHosts() error {
	return fmt.Errorf("buildah functionality is not supported on non-Linux platforms")
}

func (e *envSystemConfig) ParseHostname() (string, error) {
	hostname, _ := os.Hostname()
	return hostname, nil
}

func (e *envSystemConfig) ParseHosts() ([]string, error) {
	hostname, _ := os.Hostname()
	return []string{hostname}, nil
}