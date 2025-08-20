package request

import (
	"fmt"
	"io"
	"log"
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
	httpClient := http.DefaultClient
	req, err := generateReq(query)
	if err != nil {
		return nil, err
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP req error: %w", err)
	}
	defer func(Body io.ReadCloser) {
		err := Body.Close()
		if err != nil {
			log.Printf("=== Victoria Logs Query Failed ===")
		}
	}(resp.Body)
	if resp.StatusCode != http.StatusOK {
		body, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			return nil, fmt.Errorf(
				"HTTP %d error, unable to read error details: %w",
				resp.StatusCode,
				readErr,
			)
		}
		resp.Body.Close()
		log.Printf("=== Victoria Logs Query Failed ===")
		log.Printf("Status Code: %d", resp.StatusCode)
		log.Printf("Server: %s", resp.Header.Get("X-Server-Hostname"))
		log.Printf("Request URL: %s", req.URL.String())
		log.Printf("Error Content: %s", string(body))
		log.Printf("===================================")
		return nil, fmt.Errorf("victoria Logs query failed [%d]: %s", resp.StatusCode, string(body))
	}
	return resp, nil
}

func generateReq(query *QueryParams) (*http.Request, error) {
	baseURL, err := url.JoinPath(query.Path, "select/logsql/query")
	if err != nil {
		return nil, err
	}
	parsedURL, err := url.Parse(baseURL)
	if err != nil {
		return nil, fmt.Errorf("can not parser API URL: %w", err)
	}
	params := url.Values{}
	params.Add("query", query.Query)
	params.Add("start", query.StartTime)
	params.Add("end", query.EndTime)
	parsedURL.RawQuery = params.Encode()
	req, err := http.NewRequest(http.MethodGet, parsedURL.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("create HTTP req error: %w", err)
	}
	req.SetBasicAuth(query.Username, query.Password)
	return req, nil
}
