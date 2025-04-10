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
	"io"
	"net/http"
)

type Client struct {
	Username string
	Password string
}

var (
	ErrorManifestNotFound = errors.New("manifest not found")
)

// TODO: refactor tag image, use go package to do this

func (t *Client) TagImage(hostName string, imageName string, oldTag string, newTag string) error {
	manifest, err := t.pullManifest(t.Username, t.Password, hostName, imageName, oldTag)
	if err != nil {
		return err
	}
	return t.pushManifest(t.Username, t.Password, hostName, imageName, newTag, manifest)
}

func (t *Client) pullManifest(username string, password string, hostName string, imageName string, tag string) ([]byte, error) {
	var (
		client = http.DefaultClient
		url    = "http://" + hostName + "/v2/" + imageName + "/manifests/" + tag
	)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(username, password)
	req.Header.Set("Accept", "application/vnd.docker.distribution.manifest.v2+json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode == http.StatusNotFound {
		return nil, ErrorManifestNotFound
	}

	if resp.StatusCode != http.StatusOK {
		return nil, errors.New(resp.Status)
	}

	bodyText, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	return bodyText, nil
}

func (t *Client) pushManifest(username string, password string, hostName string, imageName string, tag string, manifest []byte) error {
	var (
		client = http.DefaultClient
		url    = "http://" + hostName + "/v2/" + imageName + "/manifests/" + tag
	)
	req, err := http.NewRequest("PUT", url, bytes.NewBuffer(manifest))
	if err != nil {
		return err
	}

	req.SetBasicAuth(username, password)
	req.Header.Set("Content-type", "application/vnd.docker.distribution.manifest.v2+json")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}

	if resp.StatusCode != http.StatusCreated {
		return errors.New(resp.Status)
	}

	return nil
}
