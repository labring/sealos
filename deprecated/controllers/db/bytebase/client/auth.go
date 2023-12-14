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

package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	api "github.com/labring/sealos/controllers/db/bytebase/client/api"
)

// Login will login the user and get the response.
func (c *Client) Login(auth *api.AuthRequest) (int, error) {
	if auth.Email == "" || auth.Password == "" {
		return 0, fmt.Errorf("define username and password")
	}

	// get web token
	auth.Web = true
	rb, err := json.Marshal(auth)
	if err != nil {
		return 0, err
	}
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/%s/auth/login", c.url, c.version), bytes.NewReader(rb))
	if err != nil {
		return 0, err
	}
	resp, err := c.client.Do(req)
	if err != nil {
		return 0, err
	}
	// no need to read body
	defer resp.Body.Close()

	accessToken := resp.Header.Get("Grpc-Metadata-Bytebase-Access-Token")
	refreshToken := resp.Header.Get("Grpc-Metadata-Bytebase-Refresh-Token")
	user := resp.Header.Get("Grpc-Metadata-Bytebase-User")

	c.loginCookie = api.LoginCookie{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         user,
	}

	return resp.StatusCode, nil
}

func (c *Client) Signup(cur *api.CreateUserRequest) (int, error) {
	if cur.Email == "" || cur.Password == "" {
		return 0, fmt.Errorf("the username and password cannot be empty")
	}
	rb, err := json.Marshal(*cur)
	if err != nil {
		return 0, err
	}
	// signup
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/%s/users", c.url, c.version), bytes.NewReader(rb))
	if err != nil {
		return 0, err
	}

	_, statusCode, err := c.doRequest(req)
	return statusCode, err
}
