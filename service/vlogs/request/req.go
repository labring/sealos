package request

import (
	"crypto/tls"
	"fmt"
	"net/http"
	"net/url"
)

type QueryParams struct {
	Path      string
	Username  string
	Password  string
	Query     string
	StartTime string
	EndTime   string
}

func QueryLogsByParams(query *QueryParams) (*http.Response, error) {
	httpClient := &http.Client{
		Transport: &http.Transport{
			// nosemgrep
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
			},
		},
	}
	req, err := generateReq(query)
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

func generateReq(query *QueryParams) (*http.Request, error) {
	baseURL, err := url.Parse(query.Path + "/select/logsql/query")
	if err != nil {
		return nil, fmt.Errorf("can not parser API URL: %v", err)
	}
	params := url.Values{}
	params.Add("query", query.Query)
	params.Add("start", query.StartTime)
	params.Add("end", query.EndTime)
	baseURL.RawQuery = params.Encode()
	req, err := http.NewRequest("GET", baseURL.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("create HTTP req error: %v", err)
	}
	req.SetBasicAuth(query.Username, query.Password)
	return req, nil
}
