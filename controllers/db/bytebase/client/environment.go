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
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	api "github.com/labring/sealos/controllers/db/bytebase/client/api"
)

// CreateEnvironment creates the environment.
func (c *Client) CreateEnvironment(ctx context.Context, environmentID string, create *api.EnvironmentMessage) (*api.EnvironmentMessage, error) {
	payload, err := json.Marshal(create)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", fmt.Sprintf("%s/%s/environments?environmentId=%s", c.url, c.version, environmentID), bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}

	body, statusCode, err := c.doAuthRequest(req)
	if err != nil {
		return nil, err
	} else if statusCode > 250 {
		return nil, fmt.Errorf("error happened while creating environment, status code: %v", statusCode)
	}

	var env api.EnvironmentMessage
	err = json.Unmarshal(body, &env)
	if err != nil {
		return nil, err
	}

	return &env, nil
}

// GetEnvironment gets the environment by id.
func (c *Client) GetEnvironment(ctx context.Context, environmentID string) (*api.EnvironmentMessage, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", fmt.Sprintf("%s/%s/environments/%s", c.url, c.version, environmentID), nil)
	if err != nil {
		return nil, err
	}

	body, statusCode, err := c.doAuthRequest(req)
	if err != nil {
		return nil, err
	} else if statusCode == http.StatusNotFound {
		return nil, fmt.Errorf("instances not found, status code: %v", statusCode)
	} else if statusCode > 250 {
		return nil, fmt.Errorf("error happened while fetching instances, status code: %v", statusCode)
	}

	var env api.EnvironmentMessage
	err = json.Unmarshal(body, &env)
	if err != nil {
		return nil, err
	}

	return &env, nil
}
