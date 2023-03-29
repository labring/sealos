package client

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	api "github.com/labring/sealos/controllers/db/bytebase/client/api"
)

// CreateEnvironment creates the environment.
func (c *Client) CreateEnvironment(ctx context.Context, environmentID string, create *api.EnvironmentMessage) (*api.EnvironmentMessage, error) {
	payload, err := json.Marshal(create)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", fmt.Sprintf("%s/%s/environments?environmentId=%s", c.url, c.version, environmentID), strings.NewReader(string(payload)))
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
