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
	"bytes"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/google/go-containerregistry/pkg/name"
)

// todo: refactor this struct, add opts for tls or something else
type Opts struct {
}

type BasicAuth struct {
	Username string
	Password string
}

type Registry struct {
	Host      string
	BasicAuth BasicAuth
}

var (
	ErrorManifestNotFound = errors.New("manifest not found")
)

// ReTag creates a new tag for an existing image by copying its manifest.
func (c *Registry) ReTag(source, target string) error {
	manifest, err := c.pullManifest(source)
	if err != nil {
		return fmt.Errorf("failed to pull manifest for %s: %w", source, err)
	}
	if err := c.pushManifest(target, manifest); err != nil {
		return fmt.Errorf("failed to push manifest for %s: %w", target, err)
	}
	return nil
}

// todo: refactor this function, add opts for tls
func (c *Registry) pullManifest(image string) ([]byte, error) {
	ref, err := name.ParseReference(image)
	if err != nil {
		return nil, fmt.Errorf("failed to parse image: %w", err)
	}

	url := fmt.Sprintf("http://%s/v2/%s/manifests/%s", ref.Context().RegistryStr(), ref.Context().RepositoryStr(), ref.Identifier())

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create GET request: %w", err)
	}

	req.SetBasicAuth(c.BasicAuth.Username, c.BasicAuth.Password)
	req.Header.Set("Accept", "application/vnd.docker.distribution.manifest.v2+json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusNotFound:
		return nil, ErrorManifestNotFound
	case http.StatusOK:
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to read response body: %w", err)
		}
		return body, nil
	default:
		return nil, fmt.Errorf("unexpected status code %d: %s", resp.StatusCode, resp.Status)
	}
}

// todo: refactor this function, add opts for tls
func (c *Registry) pushManifest(image string, manifest []byte) error {
	ref, err := name.ParseReference(image)
	if err != nil {
		return fmt.Errorf("failed to parse image: %w", err)
	}
	url := fmt.Sprintf("http://%s/v2/%s/manifests/%s", ref.Context().RegistryStr(), ref.Context().RepositoryStr(), ref.Identifier())

	req, err := http.NewRequest("PUT", url, bytes.NewBuffer(manifest))
	if err != nil {
		return fmt.Errorf("failed to create PUT request: %w", err)
	}

	req.SetBasicAuth(c.BasicAuth.Username, c.BasicAuth.Password)
	req.Header.Set("Content-Type", "application/vnd.docker.distribution.manifest.v2+json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("unexpected status code %d: %s", resp.StatusCode, resp.Status)
	}

	return nil
}
