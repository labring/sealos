package request

import (
	"crypto/tls"
	"fmt"
	"net/http"
	"net/url"
)

func generateReq(path, username, password, query string) (*http.Request, error) {
	baseURL, err := url.Parse(path + "/select/logsql/query")
	if err != nil {
		return nil, fmt.Errorf("can not parser API URL: %w", err)
	}
	params := url.Values{}
	params.Add("query", query)
	baseURL.RawQuery = params.Encode()
	req, err := http.NewRequest(http.MethodGet, baseURL.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("create HTTP req error: %w", err)
	}

	req.SetBasicAuth(username, password)
	return req, nil
}

func QueryLogsByParams(path, username, password, query string) (*http.Response, error) {
	httpClient := &http.Client{
		Transport: &http.Transport{
			// nosemgrep
			TLSClientConfig: &tls.Config{
				//nolint:gosec
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
		return nil, fmt.Errorf("HTTP req error: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("res error,err info: %+v", resp)
	}
	return resp, nil
}
