package request

import (
	"crypto/tls"
	"fmt"
	"net/http"
	"net/url"
)

func generateReq(path string, username string, password string, query string) (*http.Request, error) {
	baseURL, err := url.Parse(path + "/select/logsql/query")
	if err != nil {
		return nil, fmt.Errorf("can not parser API URL: %v", err)
	}
	params := url.Values{}
	params.Add("query", query)
	baseURL.RawQuery = params.Encode()
	req, err := http.NewRequest("GET", baseURL.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("create HTTP req error: %v", err)
	}

	req.SetBasicAuth(username, password)
	return req, nil
}

func QueryLogsByParams(path string, username string, password string, query string) (*http.Response, error) {
	httpClient := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
			},
		},
	}
	req, err := generateReq(path, username, password, query)
	if err != nil {
		return nil, err
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP req error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("res error,err info: %+v", resp)
	}
	return resp, nil
}
