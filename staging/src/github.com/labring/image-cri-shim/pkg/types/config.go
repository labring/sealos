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
	"net/url"
	"strings"
	"time"

	"github.com/labring/image-cri-shim/pkg/cri"
	"github.com/pkg/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/yaml"

	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

type CRIVersion string

const (
	CRIVersionV1       CRIVersion = "v1"
	CRIVersionV1Alpha2 CRIVersion = "v1alpha2"
	// SealosShimSock is the CRI socket the shim listens on.
	SealosShimSock = "/var/run/image-cri-shim.sock"
)

type Config struct {
	ImageShimSocket string                `json:"shim"`
	RuntimeSocket   string                `json:"cri"`
	CRIVersion      CRIVersion            `json:"version"`
	Address         string                `json:"address"`
	Force           bool                  `json:"force"`
	Debug           bool                  `json:"debug"`
	Image           string                `json:"image"`
	Timeout         metav1.Duration       `json:"timeout"`
	Auth            string                `json:"auth"`
	CRIConfigs      map[string]AuthConfig `json:"-"`
}

func (c *Config) PreProcess() error {
	if c.ImageShimSocket == "" {
		c.ImageShimSocket = SealosShimSock
	}
	logger.Info("shim-socket: %s", c.ImageShimSocket)
	logger.Info("cri-socket: %s", c.RuntimeSocket)
	logger.Info("hub-address: %s", c.Address)
	rawURL, err := url.Parse(c.Address)
	if err != nil {
		logger.Warn("url parse error: %+v", err)
	}
	domain := rawURL.Host
	var username, password string
	up := strings.Split(c.Auth, ":")
	if len(up) == 2 {
		username = up[0]
		password = up[1]
	} else {
		username = up[0]
	}
	c.CRIConfigs = map[string]AuthConfig{domain: {
		Username:      username,
		Password:      password,
		ServerAddress: c.Address,
	}}
	if c.Timeout.Duration.Milliseconds() == 0 {
		c.Timeout = metav1.Duration{}
		c.Timeout.Duration, _ = time.ParseDuration("15m")
	}

	if c.CRIVersion == "" || (c.CRIVersion != CRIVersionV1Alpha2 && c.CRIVersion != CRIVersionV1) {
		c.CRIVersion = CRIVersionV1Alpha2
		logger.Info("Version error,Using default CRI v1alpha2 image API")
	}

	logger.Info("RegistryDomain: %v", domain)
	logger.Info("Force: %v", c.Force)
	logger.Info("Debug: %v", c.Debug)
	logger.CfgConsoleLogger(c.Debug, false)
	logger.Info("ImageDir: %v, but Image config is remove", c.Image)
	logger.Info("Timeout: %v", c.Timeout)
	logger.Info("Auth: %v", c.Auth)
	logger.Info("Username: %s", username)
	logger.Info("Password: %s", password)
	logger.Info("CRIVersion: %s", c.CRIVersion)

	if c.Address == "" {
		return errors.New("registry addr is empty")
	}
	if c.RuntimeSocket == "" {
		socket, err := cri.DetectCRISocket()
		if err != nil {
			return err
		}
		c.RuntimeSocket = socket
	}
	if !c.Force {
		if !fileutil.IsExist(c.RuntimeSocket) {
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
