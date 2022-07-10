// Copyright © 2022 sealos.
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

package conf

import "github.com/labring/sealos/pkg/utils/yaml"

var GlobalConfig *Config
var Namespace = "sealos"

type Config struct {
	Port           uint16     `yaml:"port"`
	SSOType        string     `yaml:"ssoType"`
	CallbackURL    string     `yaml:"callbackUrl"`
	OAuthProviders []Provider `yaml:"oauthProviders"`
	// Empty if in InCluster mode
	Kubeconfig  string `yaml:"kubeconfig"`
	SSOEndpoint string `yaml:"ssoEndpoint"`
	CaCert      string `yaml:"caCert"`
}

type Provider struct {
	Type         string `yaml:"type"`
	ClientID     string `yaml:"clientId"`
	ClientSecret string `yaml:"clientSecret"`
}

func InitConfig(configPath string) *Config {
	config := &Config{}
	if err := yaml.UnmarshalYamlFromFile(configPath, config); err != nil {
		panic(err)
	}
	return config
}
