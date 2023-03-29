// Package client is the API message for Bytebase API client.
package client

import (
	"fmt"
	"io"
	"net/http"
	"time"

	api "github.com/labring/sealos/controllers/db/bytebase/client/api"
)

// client is the API message for Bytebase API client.
type Client struct {
	url     string
	version string
	client  *http.Client
	// auth    *api.Login
	// token is a jwt token. It's for with (grpc) OpenAPI of Bytebase. The controller uses it for internal communication like creating database instances.
	token string
	// webToken is also a jwt token. It's for web/http requests only. This is usually used to mock operations in web pages.
	webToken string
	// used for http requests. It's used by ingress (nginx) to set up user identity information through Cookie.
	requestHeaders http.Header
}

func (c *Client) GetHeaders() (http.Header, error) {
	return c.requestHeaders, nil
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
func NewClient(url, version, email, password string) (api.Client, error) {
	c := Client{
		client:  &http.Client{Timeout: 10 * time.Second},
		url:     url,
		version: version,
	}
	auth := &api.AuthRequest{
		Email:    email,
		Password: password,
		Web:      false,
	}
	// try login

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
	if c.token != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.token))
	} else {
		return nil, 0, fmt.Errorf("while doing authorized request, the token should have been set")
	}
	return c.doRequest(req)
}
