package client

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	api "github.com/labring/sealos/controllers/db/bytebase/client/api"
)

// Login will login the user and get the response.
func (c *Client) Login(auth *api.AuthRequest) (int, error) {
	if auth.Email == "" || auth.Password == "" {
		return 0, fmt.Errorf("define username and password")
	}
	auth.Web = false
	rb, err := json.Marshal(auth)
	if err != nil {
		return 0, err
	}
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/%s/auth/login", c.url, c.version), strings.NewReader(string(rb)))
	if err != nil {
		return 0, err
	}
	body, statusCode, err := c.doRequest(req)
	if err != nil {
		return statusCode, err
	}
	ar := api.AuthResponse{}
	if err = json.Unmarshal(body, &ar); err != nil {
		return statusCode, err
	}
	c.token = ar.Token

	// get web token
	auth.Web = true
	rb, err = json.Marshal(auth)
	if err != nil {
		return 0, err
	}
	req, err = http.NewRequest("POST", fmt.Sprintf("%s/%s/auth/login", c.url, c.version), strings.NewReader(string(rb)))
	if err != nil {
		return 0, err
	}
	var resp *http.Response
	resp, err = c.client.Do(req)
	if err != nil {
		return 0, err
	}
	c.requestHeaders = resp.Header.Clone()
	arWeb := api.AuthResponse{}
	defer resp.Body.Close()
	body, err = io.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, err
	}
	if err = json.Unmarshal(body, &arWeb); err != nil {
		return resp.StatusCode, err
	}
	c.webToken = arWeb.Token

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
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/%s/users", c.url, c.version), strings.NewReader(string(rb)))
	if err != nil {
		return 0, err
	}

	_, statusCode, err := c.doRequest(req)
	return statusCode, err
}

func (c *Client) CheckUserExists(userID string) error {
	req, err := http.NewRequest(http.MethodGet, fmt.Sprintf("%s/%s/users/%s", c.url, c.version, userID), nil)
	if err != nil {
		return err
	}
	_, statusCode, err := c.doAuthRequest(req)
	if err != nil {
		return err
	}
	if statusCode == 404 {
		return fmt.Errorf("user not found, status code: %v", statusCode)
	} else if statusCode > 250 {
		return fmt.Errorf("error happened while fetching user, status code: %v", statusCode)
	}
	return nil
}
