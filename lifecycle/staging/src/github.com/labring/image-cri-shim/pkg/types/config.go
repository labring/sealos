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

package types

import (
	"errors"
	"net/url"
	"strings"
	"time"

	registry2 "github.com/labring/sreg/pkg/registry/crane"

	types2 "github.com/docker/docker/api/types"

	"github.com/labring/image-cri-shim/pkg/cri"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/yaml"

	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

const (
	// SealosShimSock is the CRI socket the shim listens on.
	SealosShimSock            = "/var/run/image-cri-shim.sock"
	DefaultImageCRIShimConfig = "/etc/image-cri-shim.yaml"
)

type Registry struct {
	Address string `json:"address"`
	Auth    string `json:"auth"`
}

type Config struct {
	ImageShimSocket string          `json:"shim"`
	RuntimeSocket   string          `json:"cri"`
	Address         string          `json:"address"`
	Force           bool            `json:"force"`
	Debug           bool            `json:"debug"`
	Timeout         metav1.Duration `json:"timeout"`
	Auth            string          `json:"auth"`
	Registries      []Registry      `json:"registries"`
}

type ShimAuthConfig struct {
	CRIConfigs        map[string]types2.AuthConfig `json:"-"`
	OfflineCRIConfigs map[string]types2.AuthConfig `json:"-"`
}

func (c *Config) PreProcess() (*ShimAuthConfig, error) {
	if c.ImageShimSocket == "" {
		c.ImageShimSocket = SealosShimSock
	}
	logger.Info("shim-socket: %s", c.ImageShimSocket)
	logger.Info("cri-socket: %s", c.RuntimeSocket)
	logger.Info("hub-address: %s", c.Address)
	logger.Info("auth: %s", c.Auth)
	rawURL, err := url.Parse(c.Address)
	if err != nil {
		logger.Warn("url parse error: %+v", err)
	}
	domain := rawURL.Host
	if c.Timeout.Duration.Milliseconds() == 0 {
		c.Timeout = metav1.Duration{}
		c.Timeout.Duration, _ = time.ParseDuration("15m")
	}

	logger.Info("RegistryDomain: %v", domain)
	logger.Info("Force: %v", c.Force)
	logger.Info("Debug: %v", c.Debug)
	logger.CfgConsoleLogger(c.Debug, false)
	logger.Info("Timeout: %v", c.Timeout)
	shimAuth := new(ShimAuthConfig)

	splitNameAndPasswd := func(auth string) (string, string) {
		var username, password string
		up := strings.Split(auth, ":")
		if len(up) == 2 {
			username = up[0]
			password = up[1]
		} else {
			username = up[0]
		}
		return username, password
	}

	{
		//cri registry auth
		criAuth := make(map[string]types2.AuthConfig)
		for _, registry := range c.Registries {
			if registry.Address == "" {
				continue
			}
			name, passwd := splitNameAndPasswd(registry.Auth)
			domain = registry2.GetRegistryDomain(registry.Address)
			domain = registry2.NormalizeRegistry(domain)

			criAuth[domain] = types2.AuthConfig{
				Username:      name,
				Password:      passwd,
				ServerAddress: registry.Address,
			}
		}
		shimAuth.CRIConfigs = criAuth
		logger.Info("criRegistryAuth: %+v", shimAuth.CRIConfigs)
	}

	{
		offlineName, offlinePasswd := splitNameAndPasswd(c.Auth)
		//offline registry auth
		shimAuth.OfflineCRIConfigs = map[string]types2.AuthConfig{domain: {
			Username:      offlineName,
			Password:      offlinePasswd,
			ServerAddress: c.Address,
		}}
		logger.Info("criOfflineAuth: %+v", shimAuth.OfflineCRIConfigs)
	}

	if c.Address == "" {
		return nil, errors.New("registry addr is empty")
	}
	if c.RuntimeSocket == "" {
		socket, err := cri.DetectCRISocket()
		if err != nil {
			return nil, err
		}
		c.RuntimeSocket = socket
	}
	if !c.Force {
		if !fileutil.IsExist(c.RuntimeSocket) {
			return nil, errors.New("cri is running?")
		}
	}
	return shimAuth, nil
}

func Unmarshal(path string) (*Config, error) {
	metadata, err := fileutil.ReadAll(path)
	if err != nil {
		return nil, err
	}
	cfg := &Config{}
	if err = yaml.Unmarshal(metadata, cfg); err != nil {
		return nil, err
	}
	return cfg, err
}
