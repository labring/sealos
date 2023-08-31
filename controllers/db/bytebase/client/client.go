// Copyright © 2023 sealos.
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

// Package client is the API message for Bytebase API client.
package client

import (
	"fmt"
	"io"
	"net/http"
	"time"

	bbv1 "github.com/labring/sealos/controllers/db/bytebase/apis/bytebase/v1"
	api "github.com/labring/sealos/controllers/db/bytebase/client/api"
)

// client is the API message for Bytebase API client.
type Client struct {
	url     string
	version string
	client  *http.Client

	loginCookie api.LoginCookie
}

func CheckServerHealth(reqURL string) error {
	res, err := http.Get(reqURL)
	if err != nil {
		return err
	}
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("couldn't check server health, HTTP Code: %d", res.StatusCode)
	}
	message, err := io.ReadAll(res.Body)
	if err != nil {
		return err
	}
	if string(message) != "OK!\n" {
		return fmt.Errorf("the server is not healthy. The response message is: %s", string(message))
	}
	return nil
}

// NewClient returns the new Bytebase API client.
func NewClient(bb *bbv1.Bytebase, url, version, email, password string) (api.Client, error) {
	c := Client{
		url:     url,
		version: version,
		client:  &http.Client{Timeout: 10 * time.Second},
	}

	// if already have a token, direct use it
	if bb.Status.LoginCookie.AccessToken != "" {
		c.loginCookie = bb.Status.LoginCookie
		return &c, nil
	}

	// try login
	auth := &api.AuthRequest{
		Email:    email,
		Password: password,
		Web:      true,
	}
	if statusCode, err := c.Login(auth); err != nil {
		return nil, err
	} else if statusCode == http.StatusOK {
		return &c, nil
	} else if statusCode != http.StatusUnauthorized {
		return nil, fmt.Errorf("error happened while logging user in, status code: %v. is password correct? is the service started?", statusCode)
	}

	cur := &api.CreateUserRequest{
		Email:    email,
		Password: password,
		Type:     api.EndUser,
		Title:    "sealos-db-owner",
		Name:     "sealos-db-owner",
	}

	if statusCode, err := c.Signup(cur); err != nil {
		return nil, err
	} else if statusCode != http.StatusOK {
		return nil, fmt.Errorf("error happened while signing user up, status code: %v", statusCode)
	}

	if statusCode, err := c.Login(auth); err != nil {
		return nil, err
	} else if statusCode == http.StatusOK {
		return &c, nil
	} else {
		return nil, fmt.Errorf("error happened while logging user in after signing up, status code: %v", statusCode)
	}
}

func (c *Client) GetLoginCookie() api.LoginCookie {
	return c.loginCookie
}

func (c *Client) doRequest(req *http.Request) ([]byte, int, error) {
	res, err := c.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, 0, err
	}

	return body, res.StatusCode, nil
}

func (c *Client) doAuthRequest(req *http.Request) ([]byte, int, error) {
	if c.loginCookie.AccessToken != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.loginCookie.AccessToken))
	} else {
		return nil, 0, fmt.Errorf("while doing authorized request, the token should have been set")
	}
	return c.doRequest(req)
}
