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

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/docker/docker/api/types"
	fileutil "github.com/labring/sealos/pkg/utils/file"
	"k8s.io/apimachinery/pkg/util/json"
)

//this package contains some utils to handle docker image name
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
	authFile := "/run/user/0/containers/auth.json"
	if !fileutil.IsExist(authFile) {
		logger.Warn("if you access private registry,you must be 'sealos login' or 'buildah login'")
	} else {
		type auths struct {
			Auths map[string]types.AuthConfig `json:"auths"`
		}
		aus := &auths{}
		data, err := fileutil.ReadAll(authFile)
		if err != nil {
			return nil, err
		}
		err = json.Unmarshal(data, aus)
		if err != nil {
			return nil, err
		}
		return aus.Auths, nil
	}
	return nil, nil
}
