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

package config

import (
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Global  `yaml:"global"`
	Feature `yaml:"feature"`
}

type Global struct {
	CloudAPIServerDomain string `yaml:"cloudAPIServerDomain"`
	CloudAPIServerPort   string `yaml:"cloudAPIServerPort"`
}

type Feature struct {
	AdminSkip bool `yaml:"adminSkip"`
}

func LoadConfig(path string, target any) error {
	configData, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	err = yaml.Unmarshal(configData, target)
	if err != nil {
		return err
	}
	return nil
}
