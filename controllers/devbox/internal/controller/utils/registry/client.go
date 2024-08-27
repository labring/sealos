package registry

import (
	"bytes"
	"encoding/json"
	"errors"
	"io/ioutil"
	"net/http"
	"time"

	"github.com/avast/retry-go"
)

type Client struct {
	Username string
	Password string
}

var (
	ErrorManifestNotFound = errors.New("manifest not found")
)

func (t *Client) TagImage(hostName string, imageName string, oldTag string, newTag string) error {
	return retry.Do(func() error {
		manifest, err := t.pullManifest(t.Username, t.Password, hostName, imageName, oldTag)
		if err != nil {
			return err
		}
		return t.pushManifest(t.Username, t.Password, hostName, imageName, newTag, manifest)
	}, retry.Delay(time.Second*5), retry.Attempts(3), retry.LastErrorOnly(true))
}

func (t *Client) login(authPath string, username string, password string, imageName string) (string, error) {
	var (
		client = http.DefaultClient
		url    = authPath + imageName + ":pull,push"
	)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", err
	}

	req.SetBasicAuth(username, password)

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", errors.New(resp.Status)
	}

	bodyText, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	var data struct {
		Token       string `json:"token"`
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
		IssuedAt    string `json:"issued_at"`
	}
	if err := json.Unmarshal(bodyText, &data); err != nil {
		return "", err
	}
	if data.Token == "" {
		return "", errors.New("empty token")
	}
	return data.Token, nil
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
	req.Header.Set("Accept", "application/vnd.oci.image.manifest.v1+json")

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

	bodyText, err := ioutil.ReadAll(resp.Body)
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
	req.Header.Set("Content-type", "application/vnd.oci.image.manifest.v1+json")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}

	if resp.StatusCode != http.StatusCreated {
		return errors.New(resp.Status)
	}

	return nil
}
