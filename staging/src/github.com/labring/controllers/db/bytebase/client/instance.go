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

	"github.com/labring/sealos/controllers/db/bytebase/client/api"
)

// GetInstance gets the instance by id.
func (c *Client) GetInstance(ctx context.Context, find *api.InstanceFindMessage) (*api.InstanceMessage, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", fmt.Sprintf("%s/%s/environments/%s/instances/%s", c.url, c.version, find.EnvironmentID, find.InstanceID), nil)
	if err != nil {
		return nil, err
	}

	body, statusCode, err := c.doAuthRequest(req)
	if err != nil {
		return nil, err
	} else if statusCode == http.StatusNotFound {
		return nil, fmt.Errorf("instance not found, status code: %v", statusCode)
	} else if statusCode > 250 {
		return nil, fmt.Errorf("error happened while fetching instance, status code: %v", statusCode)
	}

	var res api.InstanceMessage
	err = json.Unmarshal(body, &res)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

// CreateInstance creates the instance.
func (c *Client) CreateInstance(ctx context.Context, environmentID, instanceID string, instance *api.InstanceMessage) (*api.InstanceMessage, error) {
	payload, err := json.Marshal(instance)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", fmt.Sprintf("%s/%s/environments/%s/instances?instanceId=%s", c.url, c.version, environmentID, instanceID), bytes.NewReader(payload))

	if err != nil {
		return nil, err
	}

	body, statusCode, err := c.doAuthRequest(req)
	if err != nil {
		return nil, err
	} else if statusCode > 250 {
		return nil, fmt.Errorf("error happened while fetching instances, status code: %v", statusCode)
	}

	var res api.InstanceMessage
	err = json.Unmarshal(body, &res)
	if err != nil {
		return nil, err
	}

	return &res, nil
}
