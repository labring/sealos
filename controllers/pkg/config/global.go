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

type Global struct {
	CloudDomain    string `yaml:"cloudDomain"`
	CloudPort      string `yaml:"cloudPort"`
	RegionUID      string `yaml:"regionUID"`
	CertSecretName string `yaml:"certSecretName"`
}

type Kube struct {
	Version       string `yaml:"version"`
	APIServerHost string `yaml:"apiServerHost"`
	APIServerPort string `yaml:"apiServerPort"`
}

type Common struct {
	GuideEnabled string `yaml:"guideEnabled"`
	APIEnabled   string `yaml:"apiEnabled"`
}

type Database struct {
	MongodbURI             string `yaml:"mongodbURI"`
	GlobalCockroachdbURI   string `yaml:"globalCockroachdbURI"`
	RegionalCockroachdbURI string `yaml:"regionalCockroachdbURI"`
}

func LoadConfig(path string, target interface{}) error {
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
