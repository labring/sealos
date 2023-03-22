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
	"runtime"
	"strings"

	v1 "github.com/google/go-containerregistry/pkg/v1"

	"github.com/containers/image/v5/pkg/docker/config"
	imagetypes "github.com/containers/image/v5/types"
	"github.com/docker/docker/api/types"
	"github.com/google/go-containerregistry/pkg/crane"

	"github.com/labring/sealos/pkg/registry/authn"
	"github.com/labring/sealos/pkg/registry/name"
	"github.com/labring/sealos/pkg/utils/http"
	"github.com/labring/sealos/pkg/utils/registry"
)

// this package contains some utils to handle docker image name
const (
	defaultDomain = "docker.io"
)

func GetAuthInfo(sys *imagetypes.SystemContext) (map[string]types.AuthConfig, error) {
	creds, err := config.GetAllCredentials(sys)
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

func GetImageManifestFromAuth(image string, authConfig map[string]types.AuthConfig) (newImage string, data []byte, cfg *types.AuthConfig, err error) {
	newImage = image
	if authConfig == nil {
		authConfig, err = GetAuthInfo(nil)
		if err != nil {
			return newImage, nil, nil, err
		}
	}
	craneOpts := []crane.Option{crane.WithAuthFromKeychain(authn.NewDefaultKeychain(authConfig)), crane.WithTransport(http.DefaultSkipVerify)}
	var ref name.Reference
	var repo string
	ref, err = name.ParseReference(image)
	if err != nil {
		return newImage, nil, nil, err
	}
	parts := strings.SplitN(ref.Name(), "/", 2)
	if len(parts) == 2 && (strings.ContainsRune(parts[0], '.') || strings.ContainsRune(parts[0], ':')) {
		// The first part of the repository is treated as the registry domain
		// iff it contains a '.' or ':' character, otherwise it is all repository
		// and the domain defaults to Docker Hub.
		_ = parts[0]
		repo = parts[1]
	}

	for domain, c := range authConfig {
		newImage = strings.Join([]string{domain, repo}, "/")
		ref, err = name.ParseReference(newImage)
		if url, ook := http.IsURL(c.ServerAddress); ook {
			if url.Scheme == "http" {
				ref, err = name.ParseReference(newImage, name.Insecure)
				craneOpts = append(craneOpts, crane.Insecure)
			}
		}
		craneOpts = append(craneOpts, crane.WithPlatform(&v1.Platform{
			OS:           "linux",
			Architecture: runtime.GOARCH,
		}))
		//logs.Debug.SetOutput(os.Stderr)
		if err != nil {
			continue
		}
		data, err = crane.Manifest(ref.Name(), craneOpts...)
		if err == nil {
			return newImage, data, &c, nil
		}
	}
	return image, nil, nil, err
}
