// Copyright © 2021 sealos.
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

package registry

import (
	"fmt"
	"strings"

	"github.com/containers/image/v5/pkg/docker/config"

	"github.com/labring/sealos/pkg/utils/registry"

	"github.com/docker/docker/api/types"
)

// this package contains some utils to handle docker image name
const (
	legacyDefaultDomain = "index.docker.io"
	defaultDomain       = "docker.io"
	officialRepoName    = "library"
	defaultTag          = "latest"
)

// docker image name struct
type Named struct {
	domain string //eg. docker.io
	repo   string //eg. library/ubuntu
	tag    string //eg. latest
}

func (n Named) FullName() string {
	return n.domain + "/" + n.repo + ":" + n.tag
}

func (n Named) Domain() string {
	return n.domain
}

func (n Named) Repo() string {
	return n.repo
}

func (n Named) Tag() string {
	return n.tag
}

func splitDockerDomain(name string) (domain, remainder string) {
	i := strings.IndexRune(name, '/')
	if i == -1 || (!strings.ContainsAny(name[:i], ".:") && name[:i] != "localhost" && strings.ToLower(name[:i]) == name[:i]) {
		domain, remainder = defaultDomain, name
	} else {
		domain, remainder = name[:i], name[i+1:]
	}
	if domain == legacyDefaultDomain {
		domain = defaultDomain
	}
	if domain == defaultDomain && !strings.ContainsRune(remainder, '/') {
		remainder = officialRepoName + "/" + remainder
	}
	return
}

func ParseNormalizedNamed(s string) (Named, error) {
	domain, remainder := splitDockerDomain(s)
	var remoteName, tag string
	if tagSep := strings.IndexRune(remainder, ':'); tagSep > -1 {
		tag = remainder[tagSep+1:]
		remoteName = remainder[:tagSep]
	} else {
		tag = defaultTag
		remoteName = remainder
	}
	if strings.ToLower(remoteName) != remoteName {
		return Named{}, fmt.Errorf("invalid reference format: repository name (%s) must be lowercase", remoteName)
	}

	named := Named{
		domain: domain,
		repo:   remoteName,
		tag:    tag,
	}
	return named, nil
}

func GetAuthInfo() (map[string]types.AuthConfig, error) {
	creds, err := config.GetAllCredentials(nil)
	if err != nil {
		return nil, err
	}
	auths := make(map[string]types.AuthConfig, 0)

	for domain, cred := range creds {
		reg, err := registry.NewRegistryForDomain(domain, cred.Username, cred.Password)
		if err == nil {
			auths[domain] = types.AuthConfig{
				Username:      cred.Username,
				Password:      cred.Password,
				ServerAddress: reg.URL,
				IdentityToken: cred.IdentityToken,
			}
		}
	}
	return auths, nil
}
