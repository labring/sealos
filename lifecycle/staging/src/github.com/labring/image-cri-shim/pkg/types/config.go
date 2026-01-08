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
	DefaultReloadInterval     = 15 * time.Second
	defaultCacheStatsInterval = time.Minute
	defaultImageCacheTTL      = 30 * time.Minute
	defaultDomainCacheTTL     = 10 * time.Minute
	defaultImageCacheSize     = 1024

	// Registry priority constants
	SealosHubDefaultPriority = 1000  // Default priority for sealos.hub (offline registry)
	RegistryDefaultPriority  = 500   // Default priority for user-configured registries
	MinPriority              = 0     // Minimum priority value
	MaxPriority              = 10000 // Maximum priority value
)

type Registry struct {
	Address  string `json:"address" yaml:"address"`
	Auth     string `json:"auth" yaml:"auth,omitempty"`
	Priority int    `json:"priority,omitempty" yaml:"priority,omitempty"` // Registry priority (0-1000), higher is preferred
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
	Cache           CacheConfig     `json:"cache" yaml:"cache"`
	Registries      []Registry      `json:"registries" yaml:"registries,omitempty"`
	OfflinePriority int             `json:"offlinePriority,omitempty" yaml:"offlinePriority,omitempty"` // Custom priority for sealos.hub (default: 1000)
}

type CacheConfig struct {
	ImageCacheSize   int             `json:"imageCacheSize" yaml:"imageCacheSize"`
	ImageCacheTTL    metav1.Duration `json:"imageCacheTTL" yaml:"imageCacheTTL"`
	DomainCacheTTL   metav1.Duration `json:"domainCacheTTL" yaml:"domainCacheTTL"`
	StatsLogInterval metav1.Duration `json:"statsLogInterval" yaml:"statsLogInterval"`
	DisableStats     bool            `json:"disableStats" yaml:"disableStats"`
}

type ShimAuthConfig struct {
	CRIConfigs          map[string]types2.AuthConfig `json:"-"`
	CRIPriorities       map[string]int               `json:"-"` // Registry priority mapping
	OfflineCRIConfigs   map[string]types2.AuthConfig `json:"-"`
	OfflinePriority     int                          `json:"-"` // Priority for offline registry (sealos.hub)
	SkipLoginRegistries map[string]bool              `json:"-"`
}

func registryMatchDomain(reg Registry) string {
	domain := registry2.GetRegistryDomain(reg.Address)
	return registry2.NormalizeRegistry(domain)
}

func (c *Config) PreProcess() (*ShimAuthConfig, error) {
	if c.ImageShimSocket == "" {
		c.ImageShimSocket = SealosShimSock
	}
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
	logger.CfgConsoleLogger(c.Debug, false)
	c.Cache.normalize()
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
		criPriorities := make(map[string]int)
		skipLogin := make(map[string]bool)
		for _, registry := range c.Registries {
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

			// Handle priority: use configured value or default
			priority := registry.Priority
			if priority == 0 {
				priority = RegistryDefaultPriority
			} else if priority < MinPriority {
				logger.Warn("registry %q priority %d is below minimum, using %d", registry.Address, priority, MinPriority)
				priority = MinPriority
			} else if priority > MaxPriority {
				logger.Warn("registry %q priority %d exceeds maximum, using %d", registry.Address, priority, MaxPriority)
				priority = MaxPriority
			}

			criAuth[localDomain] = cfg
			criPriorities[localDomain] = priority
		}
		shimAuth.CRIConfigs = criAuth
		shimAuth.CRIPriorities = criPriorities
		shimAuth.SkipLoginRegistries = skipLogin
		logger.Debug("criRegistryAuth: %+v, priorities: %+v", shimAuth.CRIConfigs, shimAuth.CRIPriorities)
	}

	{
		offlineName, offlinePasswd := splitNameAndPasswd(c.Auth)
		//offline registry auth
		shimAuth.OfflineCRIConfigs = map[string]types2.AuthConfig{domain: {
			Username:      offlineName,
			Password:      offlinePasswd,
			ServerAddress: c.Address,
		}}

		// Handle offline priority: use configured value or default
		offlinePriority := c.OfflinePriority
		if offlinePriority == 0 {
			offlinePriority = SealosHubDefaultPriority
		} else if offlinePriority < MinPriority {
			logger.Warn("offline registry priority %d is below minimum, using %d", offlinePriority, MinPriority)
			offlinePriority = MinPriority
		} else if offlinePriority > MaxPriority {
			logger.Warn("offline registry priority %d exceeds maximum, using %d", offlinePriority, MaxPriority)
			offlinePriority = MaxPriority
		}

		shimAuth.OfflinePriority = offlinePriority
		logger.Debug("criOfflineAuth: %+v, priority: %d", shimAuth.OfflineCRIConfigs, shimAuth.OfflinePriority)
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

func (c *CacheConfig) normalize() {
	if c.ImageCacheSize == 0 {
		c.ImageCacheSize = defaultImageCacheSize
	}
	if c.ImageCacheSize < 0 {
		logger.Warn("received negative cache size %d, disabling cache", c.ImageCacheSize)
		c.ImageCacheSize = 0
	}

	if c.ImageCacheTTL.Duration <= 0 {
		c.ImageCacheTTL = metav1.Duration{Duration: defaultImageCacheTTL}
	}
	if c.DomainCacheTTL.Duration <= 0 {
		c.DomainCacheTTL = metav1.Duration{Duration: defaultDomainCacheTTL}
	}
	if c.DisableStats {
		c.StatsLogInterval = metav1.Duration{}
		return
	}
	if c.StatsLogInterval.Duration <= 0 {
		c.StatsLogInterval = metav1.Duration{Duration: defaultCacheStatsInterval}
	}
}

func Unmarshal(path string) (*Config, error) {
	metadata, err := fileutil.ReadAll(path)
	if err != nil {
		return nil, err
	}
	return UnmarshalData(metadata)
}

func UnmarshalData(metadata []byte) (*Config, error) {
	cfg := &Config{
		Cache: CacheConfig{
			StatsLogInterval: metav1.Duration{Duration: defaultCacheStatsInterval},
		},
	}
	if err := yaml.Unmarshal(metadata, cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}
