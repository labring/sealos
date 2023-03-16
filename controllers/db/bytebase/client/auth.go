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
func (c *Client) Login(auth *api.AuthRequest) error {
	if auth.Email == "" || auth.Password == "" {
		return fmt.Errorf("define username and password")
	}
	auth.Web = false
	rb, err := json.Marshal(auth)
	if err != nil {
		return err
	}
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/%s/auth/login", c.url, c.version), strings.NewReader(string(rb)))
	if err != nil {
		return err
	}
	body, err := c.doRequest(req)
	if err != nil {
		return err
	}
	ar := api.AuthResponse{}
	if err = json.Unmarshal(body, &ar); err != nil {
		return err
	}
	c.token = ar.Token

	auth.Web = true
	rb, err = json.Marshal(auth)
	if err != nil {
		return err
	}
	req, err = http.NewRequest("POST", fmt.Sprintf("%s/%s/auth/login", c.url, c.version), strings.NewReader(string(rb)))
	if err != nil {
		return err
	}
	var resp *http.Response
	resp, err = c.client.Do(req)
	if err != nil {
		return err
	}
	c.requestHeaders = resp.Header.Clone()
	// respHeaders := resp.Header.Get("Set-Cookie")
	// for _, header := range respHeaders {
	//	headers.Add("Cookie", string(header))
	// }
	arWeb := api.AuthResponse{}
	defer resp.Body.Close()
	body, err = io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if err = json.Unmarshal(body, &arWeb); err != nil {
		return err
	}
	c.webToken = arWeb.Token

	return nil
}

func (c *Client) Signup(cur *api.CreateUserRequest) error {
	if cur.Email == "" || cur.Password == "" {
		return fmt.Errorf("the username and password cannot be empty")
	}
	rb, err := json.Marshal(*cur)
	if err != nil {
		return err
	}
	// signup
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/%s/users", c.url, c.version), strings.NewReader(string(rb)))
	if err != nil {
		return err
	}

	if _, err := c.doRequest(req); err != nil {
		return err
	}
	return nil
}

func (c *Client) FetchToken() (string, error) {
	return c.token, nil
}
