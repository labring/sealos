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

package server

import (
	"strings"

	"github.com/docker/docker/api/types/registry"

	"github.com/labring/sreg/pkg/registry/crane"

	"github.com/labring/sealos/pkg/utils/logger"

	name "github.com/google/go-containerregistry/pkg/name"
)

// craneGetImageManifest is declared as a var so tests can replace it with a stub implementation.
var craneGetImageManifest = crane.GetImageManifestFromAuth

// replaceImage replaces the image name to a new valid image name with the private registry.
func replaceImage(image, action string, authConfig map[string]registry.AuthConfig) (newImage string,
	isReplace bool, cfg *registry.AuthConfig) {
	if len(authConfig) == 0 {
		return image, false, nil
	}

	ref, err := name.ParseReference(image)
	if err != nil {
		logger.Warn("rewrite skipped: unable to parse image reference %s: %v", image, err)
		return image, false, nil
	}

	repo := ref.Context().RepositoryStr()
	if repo == "" {
		logger.Debug("image %s missing repository segment, skipping replacement", image)
		return image, false, nil
	}

	newImage, _, cfg, err = craneGetImageManifest(image, authConfig)
	if err != nil {
		if strings.Contains(image, "@") {
			return replaceImage(strings.Split(image, "@")[0], action, authConfig)
		}
		logger.Warn("rewrite skipped: failed to fetch manifest for %s (action=%s): %v", image, action, err)
		return image, false, cfg
	}
	return newImage, true, cfg
}

func registryFromImage(image string) string {
	parts := strings.SplitN(image, "/", 2)
	if len(parts) == 0 {
		return ""
	}
	return parts[0]
}

func shouldSkipAuth(domain string, cfg *registry.AuthConfig, skip map[string]bool) bool {
	if skip != nil && skip[domain] {
		return true
	}
	if cfg == nil {
		return true
	}
	return cfg.Username == "" && cfg.Password == "" && cfg.Auth == "" && cfg.IdentityToken == "" && cfg.RegistryToken == ""
}

func referenceSuffix(ref name.Reference) string {
	switch v := ref.(type) {
	case name.Tag:
		return ":" + v.TagStr()
	case name.Digest:
		return "@" + v.DigestStr()
	default:
		if id := ref.Identifier(); id != "" {
			return ":" + id
		}
	}
	return ""
}

const defaultDockerRegistry = "docker.io"

func extractDomainFromImage(image string) string {
	if image == "" {
		return ""
	}
	ref, err := name.ParseReference(image)
	if err != nil {
		return normalizeDomainCandidate(registryFromImage(image))
	}
	domain := ref.Context().RegistryStr()
	if domain == "" {
		return defaultDockerRegistry
	}
	return normalizeDomainCandidate(domain)
}

// RegistryWithPriority represents a registry with its priority for sorting
type RegistryWithPriority struct {
	Domain   string
	Config   registry.AuthConfig
	Priority int
}

// ReplaceImageWithPriority tries to replace an image using registries in priority order
// Returns the first successfully replaced image, or the original if all fail
func ReplaceImageWithPriority(image, action string, registries []RegistryWithPriority) (newImage string, isReplace bool, cfg *registry.AuthConfig) {
	if len(registries) == 0 {
		return image, false, nil
	}

	// Extract domain from image for potential domain cache miss tracking
	imageDomain := extractDomainFromImage(image)

	// Try each registry in priority order
	for _, reg := range registries {
		authMap := map[string]registry.AuthConfig{reg.Domain: reg.Config}
		result, replaced, authConfig := replaceImage(image, action, authMap)
		if replaced {
			logger.Info("priority match: image=%s action=%s matched_registry=%s priority=%d result=%s",
				image, action, reg.Domain, reg.Priority, result)
			if authConfig != nil {
				return result, true, authConfig
			}
			return result, true, nil
		}
		logger.Debug("priority match: image=%s action=%s registry=%s priority=%d no manifest",
			image, action, reg.Domain, reg.Priority)
	}

	// If we get here, no registry matched - this is a domain miss for tracking purposes
	logger.Debug("priority match: image=%s action=%s no registry found, using original (domain=%s)", image, action, imageDomain)
	return image, false, nil
}

func normalizeDomainCandidate(domain string) string {
	switch domain {
	case "", "library", "docker", "index.docker.io", "registry-1.docker.io":
		return defaultDockerRegistry
	}
	if !strings.Contains(domain, ".") && !strings.Contains(domain, ":") && domain != "localhost" {
		return defaultDockerRegistry
	}
	return domain
}
