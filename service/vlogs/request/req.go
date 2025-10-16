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

func QueryLogsByParams(query *QueryParams) (io.ReadCloser, error) {
	httpClient := http.DefaultClient
	req, err := generateReq(query)
	if err != nil {
		return nil, err
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP req error: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		defer resp.Body.Close()
		body, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			return nil, fmt.Errorf(
				"HTTP %d error, unable to read error details: %w",
				resp.StatusCode,
				readErr,
			)
		}
		log.Printf("=== Victoria Logs Query Failed ===")
		log.Printf("Status Code: %d", resp.StatusCode)
		log.Printf("Server: %s", resp.Header.Get("X-Server-Hostname"))
		log.Printf("Request URL: %s", req.URL.String())
		log.Printf("Error Content: %s", string(body))
		log.Printf("===================================")
		return nil, fmt.Errorf("victoria Logs query failed [%d]: %s", resp.StatusCode, string(body))
	}
	return resp.Body, nil
}

func generateReq(query *QueryParams) (*http.Request, error) {
	parsedURL, err := url.Parse(query.Path)
	if err != nil {
		return nil, fmt.Errorf("can not parser API URL: %w", err)
	}
	parsedURL = parsedURL.JoinPath("select/logsql/query")
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
