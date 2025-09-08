package request

import (
	"crypto/tls"
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
		// 读取错误响应体
		body, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			return nil, fmt.Errorf("HTTP %d error, 无法读取错误详情: %v", resp.StatusCode, readErr)
		}

		resp.Body.Close()

		// 详细的错误日志
		log.Printf("=== Victoria Logs 查询失败 ===")
		log.Printf("状态码: %d", resp.StatusCode)
		log.Printf("服务器: %s", resp.Header.Get("X-Server-Hostname"))
		log.Printf("请求URL: %s", req.URL.String())
		log.Printf("错误内容: %s", string(body))
		log.Printf("=============================")

		return nil, fmt.Errorf("Victoria Logs查询失败 [%d]: %s", resp.StatusCode, string(body))
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
