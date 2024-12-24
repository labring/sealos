// Copyright © 2024 sealos.
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
	"context"
	"errors"

	"github.com/google/go-containerregistry/pkg/name"
	registry "github.com/regclient/regclient"
	"github.com/regclient/regclient/config"
	"github.com/regclient/regclient/types/ref"
)

var (
	ErrorManifestNotFound = errors.New("manifest not found")
)

type Registry struct {
	Username string
	Password string
}

func (r *Registry) Tag(originImage, newImage string) error {
	original, err := r.parseReference(originImage)
	if err != nil {
		return err
	}
	target, err := r.parseReference(newImage)
	if err != nil {
		return err
	}

	originHost := r.wrapHost(target.Registry)
	targetHost := r.wrapHost(original.Registry)

	hub := registry.New(
		registry.WithConfigHost(*originHost),
		registry.WithConfigHost(*targetHost),
	)
	return hub.ImageCopy(context.Background(), original, target)
}

func (r *Registry) wrapHost(hostUrl string) *config.Host {
	host := config.HostNewDefName(nil, "http://"+hostUrl)
	host.User = r.Username
	host.Pass = r.Password
	host.TLS = config.TLSDisabled
	return host
}

func (r *Registry) parseReference(image string) (ref.Ref, error) {
	original, err := name.ParseReference(image)
	if err != nil {
		return ref.Ref{}, err
	}
	originalRef := ref.Ref{
		Scheme:     "reg",
		Registry:   original.Context().RegistryStr(),
		Repository: original.Context().RepositoryStr(),
		Tag:        original.Identifier(),
	}
	return originalRef, nil
}
