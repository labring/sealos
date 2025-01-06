package request

import (
	"crypto/tls"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
)

func generateReq(query string) (*http.Request, error) {
	//地址
	vlogsHost := GetVLogsServerFromEnv()
	vlogsHost = "https://vvvvvlogs.192.168.10.35.nip.io"
	//if vlogsHost == "" {
	//	return nil, api.ErrNoVMHost
	//}
	baseURL, err := url.Parse(vlogsHost + "/select/logsql/query")
	if err != nil {
		return nil, fmt.Errorf("无法解析 API URL: %v", err)
	}

	//参数
	params := url.Values{}
	params.Add("query", query)
	baseURL.RawQuery = params.Encode()

	//创建请求
	req, err := http.NewRequest("GET", baseURL.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("创建 HTTP 请求失败: %v", err)
	}

	//认证
	username, password := GetVLogsUsernameAndPasswordFromEnv()
	username = "admin"
	password = "sealos@123#@!"
	req.SetBasicAuth(username, password)

	return req, nil
}

func QueryLogsByParams(query string, rw http.ResponseWriter) error {
	httpClient := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
			},
		},
	}
	req, err := generateReq(query)
	if err != nil {
		return err
	}
	// 发起请求
	resp, err := httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("HTTP 请求失败: %v", err)
	}
	defer resp.Body.Close()

	// 检查 HTTP 状态码
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("请求失败，状态码: %d", resp)
	} else {
		_, err := io.Copy(rw, resp.Body)
		if err != nil {
			return err
		}
	}
	return nil
}

func GetVLogsUsernameAndPasswordFromEnv() (string, string) {
	return os.Getenv("VLOGS_SERVICE_USERNAME"), os.Getenv("VLOGS_SERVICE_PASSWORD")
}

func GetVLogsServerFromEnv() string {
	return os.Getenv("VLOGS_SERVICE_HOST")
}
