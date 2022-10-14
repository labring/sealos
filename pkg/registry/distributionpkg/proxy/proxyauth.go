// Copyright © 2021 https://github.com/distribution/distribution
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

package proxy

import (
	"crypto/tls"
	"net/http"
	"net/url"
	"strings"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/pkg/registry/distributionpkg/client/auth"
	"github.com/labring/sealos/pkg/registry/distributionpkg/client/auth/challenge"
)

// comment this const because not used
//const challengeHeader = "Docker-Distribution-Api-Version"

const certUnknown = "x509: certificate signed by unknown authority"

type userpass struct {
	username string
	password string
}

type credentials struct {
	creds map[string]userpass
}

func (c credentials) Basic(u *url.URL) (string, string) {
	up := c.creds[u.String()]

	return up.username, up.password
}

func (c credentials) RefreshToken(u *url.URL, service string) string {
	return ""
}

func (c credentials) SetRefreshToken(u *url.URL, service, token string) {
}

// configureAuth stores credentials for challenge responses
func configureAuth(username, password, remoteURL string, basicAuth bool) (auth.CredentialStore, error) {
	creds := map[string]userpass{}

	authURLs, err := getAuthURLs(remoteURL)
	if err != nil {
		return nil, err
	}

	for _, url := range authURLs {
		//		context.GetLogger(context.Background()).Infof("Discovered token authentication URL: %s", url)
		creds[url] = userpass{
			username: username,
			password: password,
		}
	}
	if len(authURLs) == 0 && basicAuth {
		creds[remoteURL] = userpass{
			username: username,
			password: password,
		}
	}
	return credentials{creds: creds}, nil
}

func getAuthURLs(remoteURL string) ([]string, error) {
	authURLs := []string{}

	resp, err := http.Get(remoteURL + "/v2/")
	if err != nil {
		if strings.Contains(err.Error(), certUnknown) {
			logger.Warn("create connect with unauthenticated registry url: %s", remoteURL)
			resp, err = newClientSkipVerify().Get(remoteURL + "/v2/")
			if err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}
	defer resp.Body.Close()

	for _, c := range challenge.ResponseChallenges(resp) {
		if strings.EqualFold(c.Scheme, "bearer") {
			authURLs = append(authURLs, c.Parameters["realm"])
		}
	}

	return authURLs, nil
}

// #nosec
func ping(manager challenge.Manager, endpoint string) error {
	resp, err := http.Get(endpoint)
	if err != nil {
		if strings.Contains(err.Error(), certUnknown) {
			resp, err = newClientSkipVerify().Get(endpoint)
			if err != nil {
				return err
			}
		} else {
			return err
		}
	}
	defer resp.Body.Close()

	return manager.AddResponse(resp)
}

// #nosec
func newClientSkipVerify() *http.Client {
	return &http.Client{
		Transport: &http.Transport{
			// nosemgrep
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
			},
		},
	}
}
