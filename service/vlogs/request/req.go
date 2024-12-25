package request

import (
	"bufio"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/labring/sealos/service/pkg/api"
	"net/http"
	"net/url"
	"os"
	"strings"
)

const (
	defaultTime  = "_time:1h"
	defaultLimit = "| limit 10"
)

func GetQuery(query *api.VlogsRequest) (string, error) {
	var builder strings.Builder

	// 添加关键词
	builder.WriteString(query.Keyword)
	builder.WriteString(" ")

	// 判断 namespace
	if query.NS == "" {
		return "", errors.New("namespace (NS) is required")
	}
	builder.WriteString(fmt.Sprintf("{namespace=%s}", query.NS))
	builder.WriteString(" ")

	// 添加 pod
	if query.Pod != "" {
		builder.WriteString(fmt.Sprintf("pod:%s", query.Pod))
		builder.WriteString(" ")
	}

	// 添加时间
	if query.Time == "" {
		builder.WriteString(defaultTime)
	} else {
		builder.WriteString("_time:")
		builder.WriteString(query.Time)
	}
	builder.WriteString(" ")

	// JSON 模式
	if query.Json == "true" {
		builder.WriteString("| unpack_json")
		builder.WriteString(" ")
	}

	// 添加 limit
	if query.Limit == "" {
		builder.WriteString(defaultLimit)
	} else {
		builder.WriteString("| limit ")
		builder.WriteString(query.Limit)
	}
	builder.WriteString(" ")

	//添加field

	return builder.String(), nil
}

func QueryLogsByParams(query *api.VlogsRequest) ([]api.VlogsResult, error) {
	httpClient := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
			},
		},
	}
	vlogsHost := GetVLogsServerFromEnv()
	vlogsHost = "https://vvvvvlogs.192.168.10.35.nip.io"
	if vlogsHost == "" {
		return nil, api.ErrNoVMHost
	}
	result, _ := GetQuery(query)
	baseURL, err := url.Parse(vlogsHost + "/select/logsql/query")
	if err != nil {
		return nil, fmt.Errorf("无法解析 API URL: %v", err)
	}
	params := url.Values{}
	params.Add("query", result)
	baseURL.RawQuery = params.Encode()

	// 创建 HTTP 请求
	req, err := http.NewRequest("GET", baseURL.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("创建 HTTP 请求失败: %v", err)
	}

	// 添加 Basic Auth 认证
	username, password := GetVLogsUsernameAndPasswordFromEnv()
	username = "admin"
	password = "sealos@123#@!"
	req.SetBasicAuth(username, password)

	// 发起请求
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP 请求失败: %v", err)
	}
	defer resp.Body.Close()
	// 检查 HTTP 状态码
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("请求失败，状态码: %d", resp)
	}

	// 使用 Scanner 逐行读取响应内容
	var results []api.VlogsResult
	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		var entry api.VlogsResult
		err := json.Unmarshal([]byte(line), &entry)
		if err != nil {
			fmt.Printf("解析日志行失败: %v, 行内容: %s\n", err, line)
			continue
		}
		results = append(results, entry)
	}

	return results, nil
}

func QueryLogsByLogsQl(query string) ([]api.VlogsResult, error) {
	httpClient := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
			},
		},
	}
	vlogsHost := GetVLogsServerFromEnv()
	vlogsHost = "https://vvvvvlogs.192.168.10.35.nip.io"
	if vlogsHost == "" {
		return nil, api.ErrNoVMHost
	}
	result := query
	baseURL, err := url.Parse(vlogsHost + "/select/logsql/query")
	if err != nil {
		return nil, fmt.Errorf("无法解析 API URL: %v", err)
	}
	params := url.Values{}
	params.Add("query", result)
	baseURL.RawQuery = params.Encode()

	// 创建 HTTP 请求
	req, err := http.NewRequest("GET", baseURL.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("创建 HTTP 请求失败: %v", err)
	}

	// 添加 Basic Auth 认证
	username, password := GetVLogsUsernameAndPasswordFromEnv()
	username = "admin"
	password = "sealos@123#@!"
	req.SetBasicAuth(username, password)

	// 发起请求
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP 请求失败: %v", err)
	}
	defer resp.Body.Close()
	// 检查 HTTP 状态码
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("请求失败，状态码: %d", resp)
	}

	// 使用 Scanner 逐行读取响应内容
	var results []api.VlogsResult
	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		var entry api.VlogsResult
		err := json.Unmarshal([]byte(line), &entry)
		if err != nil {
			fmt.Printf("解析日志行失败: %v, 行内容: %s\n", err, line)
			continue
		}
		results = append(results, entry)
	}

	return results, nil
}

func GetVLogsUsernameAndPasswordFromEnv() (string, string) {
	return os.Getenv("VLOGS_SERVICE_USERNAME"), os.Getenv("VLOGS_SERVICE_PASSWORD")
}

func GetVLogsServerFromEnv() string {
	return os.Getenv("VLOGS_SERVICE_HOST")
}
