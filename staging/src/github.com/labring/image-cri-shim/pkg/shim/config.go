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

package shim

import (
	"encoding/base64"
	"net/url"
	"strings"

	"github.com/labring/image-cri-shim/pkg/cri"
	"github.com/labring/image-cri-shim/pkg/server"
	"github.com/pkg/errors"
	api "k8s.io/cri-api/pkg/apis/runtime/v1alpha2"
	"sigs.k8s.io/yaml"

	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

type Config struct {
	ShimSocket  string                    `json:"shim"`
	ImageSocket string                    `json:"cri"`
	Address     string                    `json:"address"`
	Force       bool                      `json:"force"`
	Debug       bool                      `json:"debug"`
	Image       string                    `json:"image"`
	Sync        int64                     `json:"sync"`
	Auth        string                    `json:"auth"`
	Base64Auth  string                    `json:"-"`
	Username    string                    `json:"-"`
	Password    string                    `json:"-"`
	Domain      string                    `json:"-"`
	CRIConfigs  map[string]api.AuthConfig `json:"-"`
}

func (c *Config) PreProcess() error {
	if c.ShimSocket == "" {
		c.ShimSocket = server.SealosShimSock
	}
	logger.Info("shim-socket: %s", c.ShimSocket)
	logger.Info("cri-socket: %s", c.ImageSocket)
	logger.Info("hub-address: %s", c.Address)
	rawURL, err := url.Parse(c.Address)
	if err != nil {
		logger.Warn("url parse error: %+v", err)
	}
	c.Domain = rawURL.Host
	logger.Info("hub-domain: %v", c.Domain)
	logger.Info("force: %v", c.Force)
	logger.Info("debug: %v", c.Debug)
	logger.CfgConsoleLogger(c.Debug, false)
	logger.Info("feature image-dir: %v", c.Image)
	logger.Info("feature sync: %v", c.Sync)
	logger.Info("auth: %v", c.Auth)
	up := strings.Split(c.Auth, ":")
	if len(up) == 2 {
		c.Username = up[0]
		c.Password = up[1]
	} else {
		c.Username = c.Auth
	}
	logger.Info("username: %s", c.Username)
	logger.Info("password: %s", c.Password)
	c.Base64Auth = base64.StdEncoding.EncodeToString([]byte(c.Auth))
	logger.Info("base64 auth: %v", c.Base64Auth)

	c.CRIConfigs = map[string]api.AuthConfig{c.Domain: {
		Username:      c.Username,
		Password:      c.Password,
		ServerAddress: c.Address,
	}}
	if c.Address == "" {
		return errors.New("registry addr is empty")
	}
	if c.ImageSocket == "" {
		socket, err := cri.DetectCRISocket()
		if err != nil {
			return err
		}
		c.ImageSocket = socket
	}
	if !c.Force {
		if !fileutil.IsExist(c.ImageSocket) {
			return errors.New("cri is running?")
		}
	}
	return nil
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
