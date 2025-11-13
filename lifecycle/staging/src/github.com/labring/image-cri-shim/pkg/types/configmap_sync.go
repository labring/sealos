// Copyright © 2025 sealos.
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

package types

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"

	"sigs.k8s.io/yaml"

	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

const (
	shimConfigMapNamespace = "kube-system"
	shimConfigMapName      = "image-cri-shim"
	shimConfigMapDataKey   = "registries.yaml"
)

var kubeClientFactory = buildKubeClient

type registryConfigSpec struct {
	Version        string          `yaml:"version"`
	Sealos         sealedConfig    `yaml:"sealos"`
	Registries     []registryEntry `yaml:"registries"`
	ReloadInterval string          `yaml:"reloadInterval"`
	Force          *bool           `yaml:"force"`
	Debug          *bool           `yaml:"debug"`
	Timeout        string          `yaml:"timeout"`
	Cache          *cacheSpec      `yaml:"cache"`
}

type sealedConfig struct {
	Address string       `yaml:"address"`
	Auth    registryAuth `yaml:"auth"`
}

type registryEntry struct {
	Address string       `yaml:"address"`
	Auth    registryAuth `yaml:"auth"`
}

type registryAuth struct {
	Username string `yaml:"username"`
	Password string `yaml:"password"`
}

type cacheSpec struct {
	ImageCacheSize   *int   `yaml:"imageCacheSize"`
	ImageCacheTTL    string `yaml:"imageCacheTTL"`
	DomainCacheTTL   string `yaml:"domainCacheTTL"`
	StatsLogInterval string `yaml:"statsLogInterval"`
	DisableStats     *bool  `yaml:"disableStats"`
}

// SyncConfigFromConfigMap reads the kube-system/image-cri-shim ConfigMap and, when available,
// synchronizes the registries.yaml content into the local shim configuration file. If the cluster
// or ConfigMap cannot be reached, the function simply skips the update.
func SyncConfigFromConfigMap(ctx context.Context, configPath string) {
	if strings.TrimSpace(configPath) == "" {
		return
	}
	client, err := kubeClientFactory()
	if err != nil {
		logger.Debug("skip syncing image-cri-shim config; unable to create kube client: %v", err)
		logger.Warn("you can ignore this if you are not running inside a kubernetes cluster")
		return
	}
	cm, err := client.CoreV1().ConfigMaps(shimConfigMapNamespace).Get(ctx, shimConfigMapName, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		logger.Debug("configmap %s/%s not found; skip syncing", shimConfigMapNamespace, shimConfigMapName)
		return
	}
	if err != nil {
		logger.Debug("failed to read ConfigMap %s/%s: %v", shimConfigMapNamespace, shimConfigMapName, err)
		return
	}
	if !applyConfigMapToFile(configPath, cm) {
		logger.Debug("ConfigMap %s/%s produced no updates", shimConfigMapNamespace, shimConfigMapName)
		return
	}
	logger.Info("syncing image-cri-shim config from ConfigMap completed")
}

func buildKubeClient() (kubernetes.Interface, error) {
	if cfg, err := rest.InClusterConfig(); err == nil {
		return kubernetes.NewForConfig(cfg)
	}
	kubeconfigCandidates := []string{}
	if env := os.Getenv("KUBECONFIG"); env != "" {
		kubeconfigCandidates = append(kubeconfigCandidates, env)
	}
	kubeconfigCandidates = append(kubeconfigCandidates,
		"/etc/kubernetes/admin.conf",
		"/etc/rancher/k3s/k3s.yaml",
		filepath.Join(os.Getenv("HOME"), ".kube", "config"),
	)
	for _, path := range kubeconfigCandidates {
		if path == "" {
			continue
		}
		if !fileutil.IsExist(path) {
			continue
		}
		cfg, err := clientcmd.BuildConfigFromFlags("", path)
		if err != nil {
			continue
		}
		return kubernetes.NewForConfig(cfg)
	}
	rules := clientcmd.NewDefaultClientConfigLoadingRules()
	cfg, err := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(rules, &clientcmd.ConfigOverrides{}).ClientConfig()
	if err != nil {
		return nil, err
	}
	return kubernetes.NewForConfig(cfg)
}

func applyConfigMapToFile(configPath string, cm *corev1.ConfigMap) bool {
	raw, ok := cm.Data[shimConfigMapDataKey]
	if !ok || strings.TrimSpace(raw) == "" {
		logger.Debug("ConfigMap %s/%s does not contain key %s; skip syncing", shimConfigMapNamespace, shimConfigMapName, shimConfigMapDataKey)
		return false
	}
	spec := new(registryConfigSpec)
	if err := yaml.Unmarshal([]byte(raw), spec); err != nil {
		logger.Warn("failed to parse image-cri-shim ConfigMap: %v", err)
		return false
	}
	cfg, err := Unmarshal(configPath)
	if err != nil {
		logger.Debug("failed to read local config %s: %v; using defaults", configPath, err)
		cfg = &Config{ImageShimSocket: SealosShimSock}
	}
	original, _ := yaml.Marshal(cfg)
	mergeShimConfig(cfg, spec)
	updated, err := yaml.Marshal(cfg)
	if err != nil {
		logger.Warn("failed to marshal image-cri-shim config: %v", err)
		return false
	}
	if bytes.Equal(bytes.TrimSpace(original), bytes.TrimSpace(updated)) {
		return false
	}
	if err := os.WriteFile(configPath, updated, 0o600); err != nil {
		logger.Warn("failed to write image-cri-shim config file: %v", err)
		return false
	}
	logger.Info("synced image-cri-shim config from ConfigMap into %s", configPath)
	return true
}

func mergeShimConfig(cfg *Config, spec *registryConfigSpec) {
	if cfg == nil || spec == nil {
		return
	}
	if addr := strings.TrimSpace(spec.Sealos.Address); addr != "" {
		cfg.Address = addr
	}
	username := strings.TrimSpace(spec.Sealos.Auth.Username)
	password := strings.TrimSpace(spec.Sealos.Auth.Password)
	if username != "" || password != "" {
		cfg.Auth = buildAuth(username, password)
	}
	registries := make([]Registry, 0)
	for _, item := range spec.Registries {
		addr := strings.TrimSpace(item.Address)
		if addr == "" {
			continue
		}
		reg := Registry{Address: addr}
		user := strings.TrimSpace(item.Auth.Username)
		pass := strings.TrimSpace(item.Auth.Password)
		if user != "" || pass != "" {
			reg.Auth = buildAuth(user, pass)
		}
		registries = append(registries, reg)
	}
	cfg.Registries = registries
	if spec.Force != nil {
		cfg.Force = *spec.Force
	}
	if spec.Debug != nil {
		cfg.Debug = *spec.Debug
	}
	if d := strings.TrimSpace(spec.Timeout); d != "" {
		if dur, err := time.ParseDuration(d); err != nil {
			logger.Warn("failed to parse timeout %q: %v", d, err)
		} else {
			cfg.Timeout.Duration = dur
		}
	}
	if spec.ReloadInterval != "" {
		if dur, err := time.ParseDuration(spec.ReloadInterval); err != nil {
			logger.Warn("failed to parse reloadInterval %q: %v", spec.ReloadInterval, err)
		} else {
			cfg.ReloadInterval.Duration = dur
		}
	} else {
		cfg.ReloadInterval.Duration = DefaultReloadInterval
	}
	if cfg.Timeout.Duration <= 0 {
		cfg.Timeout.Duration, _ = time.ParseDuration("15m")
	}
	if cfg.ReloadInterval.Duration <= 0 {
		cfg.ReloadInterval.Duration = DefaultReloadInterval
	}
	applyCacheSpec(cfg, spec.Cache)
}

func buildAuth(username, password string) string {
	user := strings.TrimSpace(username)
	pass := strings.TrimSpace(password)
	if user == "" && pass == "" {
		return ""
	}
	return user + ":" + pass
}

func applyCacheSpec(cfg *Config, spec *cacheSpec) {
	if cfg == nil || spec == nil {
		return
	}
	if spec.ImageCacheSize != nil {
		cfg.Cache.ImageCacheSize = *spec.ImageCacheSize
	}
	if disable := spec.DisableStats; disable != nil {
		cfg.Cache.DisableStats = *disable
	}
	if ttl := strings.TrimSpace(spec.ImageCacheTTL); ttl != "" {
		if dur, err := time.ParseDuration(ttl); err != nil {
			logger.Warn("failed to parse imageCacheTTL %q: %v", ttl, err)
		} else {
			cfg.Cache.ImageCacheTTL.Duration = dur
		}
	}
	if ttl := strings.TrimSpace(spec.DomainCacheTTL); ttl != "" {
		if dur, err := time.ParseDuration(ttl); err != nil {
			logger.Warn("failed to parse domainCacheTTL %q: %v", ttl, err)
		} else {
			cfg.Cache.DomainCacheTTL.Duration = dur
		}
	}
	if interval := strings.TrimSpace(spec.StatsLogInterval); interval != "" || (spec.DisableStats != nil && *spec.DisableStats) {
		if spec.DisableStats != nil && *spec.DisableStats {
			cfg.Cache.StatsLogInterval.Duration = 0
		} else if interval != "" {
			if dur, err := time.ParseDuration(interval); err != nil {
				logger.Warn("failed to parse statsLogInterval %q: %v", interval, err)
			} else {
				cfg.Cache.StatsLogInterval.Duration = dur
			}
		}
	}
}
