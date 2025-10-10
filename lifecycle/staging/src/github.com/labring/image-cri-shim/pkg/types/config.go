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
	"crypto/sha256"
	"errors"
	"fmt"
	"io/fs"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	registry2 "github.com/labring/sreg/pkg/registry/crane"

	types2 "github.com/docker/docker/api/types/registry"

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
	DefaultRegistryDir        = "/etc/image-cri-shim.d"
	DefaultReloadInterval     = 15 * time.Second
)

type Registry struct {
	Address string `json:"address" yaml:"address"`
	Auth    string `json:"auth" yaml:"auth,omitempty"`
}

type Config struct {
	ImageShimSocket string          `json:"shim"`
	RuntimeSocket   string          `json:"cri"`
	Address         string          `json:"address"`
	Force           bool            `json:"force"`
	Debug           bool            `json:"debug"`
	Timeout         metav1.Duration `json:"timeout"`
	ReloadInterval  metav1.Duration `json:"reloadInterval"`
	Auth            string          `json:"auth"`
	RegistryDir     string          `json:"registry.d"`
}

type ShimAuthConfig struct {
	CRIConfigs          map[string]types2.AuthConfig `json:"-"`
	OfflineCRIConfigs   map[string]types2.AuthConfig `json:"-"`
	SkipLoginRegistries map[string]bool              `json:"-"`
}

func registryMatchDomain(reg Registry) string {
	domain := registry2.GetRegistryDomain(reg.Address)
	return registry2.NormalizeRegistry(domain)
}

func (c *Config) PreProcess() (*ShimAuthConfig, error) {
	c.RegistryDir = NormalizeRegistryDir(c.RegistryDir)
	registries, err := loadRegistriesFromDir(c.RegistryDir)
	if err != nil {
		return nil, err
	}

	if c.ImageShimSocket == "" {
		c.ImageShimSocket = SealosShimSock
	}
	logger.Info("shim-socket: %s", c.ImageShimSocket)
	logger.Info("cri-socket: %s", c.RuntimeSocket)
	logger.Info("hub-address: %s", c.Address)
	logger.Info("auth: %s", c.Auth)
	logger.Info("registry.d: %s", c.RegistryDir)
	rawURL, err := url.Parse(c.Address)
	if err != nil {
		logger.Warn("url parse error: %+v", err)
	}
	domain := rawURL.Host
	if c.Timeout.Duration.Milliseconds() == 0 {
		c.Timeout = metav1.Duration{}
		c.Timeout.Duration, _ = time.ParseDuration("15m")
	}
	if c.ReloadInterval.Duration <= 0 {
		c.ReloadInterval = metav1.Duration{Duration: DefaultReloadInterval}
	}

	logger.Info("RegistryDomain: %v", domain)
	logger.Info("Force: %v", c.Force)
	logger.Info("Debug: %v", c.Debug)
	logger.CfgConsoleLogger(c.Debug, false)
	logger.Info("Timeout: %v", c.Timeout)
	logger.Info("ReloadInterval: %v", c.ReloadInterval)
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
		// cri registry auth
		criAuth := make(map[string]types2.AuthConfig)
		skipLogin := make(map[string]bool)
		for _, registry := range registries {
			if registry.Address == "" {
				continue
			}
			localDomain := registryMatchDomain(registry)
			if localDomain == "" {
				logger.Warn("skip registry entry %q: unable to determine domain", registry.Address)
				continue
			}

			authValue := strings.TrimSpace(registry.Auth)
			cfg := types2.AuthConfig{ServerAddress: registry.Address}
			if authValue == "" {
				skipLogin[localDomain] = true
			} else {
				name, passwd := splitNameAndPasswd(authValue)
				cfg.Username = name
				cfg.Password = passwd
			}

			criAuth[localDomain] = cfg
		}
		shimAuth.CRIConfigs = criAuth
		shimAuth.SkipLoginRegistries = skipLogin
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
	return UnmarshalData(metadata)
}

func UnmarshalData(metadata []byte) (*Config, error) {
	cfg := &Config{}
	if err := yaml.Unmarshal(metadata, cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}

// NormalizeRegistryDir ensures the registry directory falls back to the default path when empty.
func NormalizeRegistryDir(dir string) string {
	if strings.TrimSpace(dir) == "" {
		return DefaultRegistryDir
	}
	return dir
}

func loadRegistriesFromDir(dir string) ([]Registry, error) {
	files, err := listRegistryConfigFiles(dir)
	if err != nil {
		return nil, err
	}
	registries := make([]Registry, 0, len(files))
	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			return nil, fmt.Errorf("read registry config %s: %w", file, err)
		}
		var reg Registry
		if err := yaml.Unmarshal(data, &reg); err != nil {
			return nil, fmt.Errorf("parse registry config %s: %w", file, err)
		}
		if strings.TrimSpace(reg.Address) == "" {
			logger.Warn("skip registry config %s: address is empty", file)
			continue
		}
		registries = append(registries, reg)
	}
	return registries, nil
}

func listRegistryConfigFiles(dir string) ([]string, error) {
	dir = NormalizeRegistryDir(dir)
	entries, err := os.ReadDir(dir)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil, nil
		}
		return nil, fmt.Errorf("list registry.d %s: %w", dir, err)
	}

	files := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		ext := strings.ToLower(filepath.Ext(entry.Name()))
		if ext != ".yaml" && ext != ".yml" {
			continue
		}
		files = append(files, filepath.Join(dir, entry.Name()))
	}
	sort.Strings(files)
	return files, nil
}

// RegistryDirDigest returns a deterministic digest for the registry.d directory contents.
func RegistryDirDigest(dir string) ([]byte, error) {
	files, err := listRegistryConfigFiles(dir)
	if err != nil {
		return nil, err
	}
	if len(files) == 0 {
		return nil, nil
	}

	hasher := sha256.New()
	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			return nil, fmt.Errorf("read registry config %s: %w", file, err)
		}
		_, _ = hasher.Write([]byte(filepath.Base(file)))
		_, _ = hasher.Write(data)
	}
	return hasher.Sum(nil), nil
}
