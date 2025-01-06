package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/labring/sealos/service/pkg/auth"
	"log"
	"net/http"
	"net/url"
	"strings"

	"github.com/labring/sealos/service/pkg/api"
	"github.com/labring/sealos/service/vlogs/request"
)

type VLogsServer struct {
	Config *Config
}

func NewVMServer(c *Config) (*VLogsServer, error) {
	vl := &VLogsServer{
		Config: c,
	}
	return vl, nil
}

// 获取客户端请求的信息
func (vl *VLogsServer) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	pathPrefix := ""
	switch {
	case req.URL.Path == pathPrefix+"/queryLogsByParams":
		vl.queryLogsByParams(rw, req)
	default:
		http.Error(rw, "Not found", http.StatusNotFound)
		return
	}
}

func (vl *VLogsServer) queryLogsByParams(rw http.ResponseWriter, req *http.Request) {
	kubeConfig, namespace, query, err := vl.ParseParamsRequest(req)
	if err != nil {
		http.Error(rw, fmt.Sprintf("Bad request (%s)", err), http.StatusBadRequest)
		log.Printf("Bad request (%s)\n", err)
		return
	}

	err = auth.Authenticate(namespace, kubeConfig)
	if err != nil {
		http.Error(rw, fmt.Sprintf("Authentication failed (%s)", err), http.StatusInternalServerError)
		log.Printf("Authentication failed (%s)\n", err)
		return
	}

	err = request.QueryLogsByParams(query, rw)
	if err != nil {
		http.Error(rw, fmt.Sprintf("Query failed (%s)", err), http.StatusInternalServerError)
		log.Printf("Query failed (%s)\n", err)
		return
	}
	return
}

func (vl *VLogsServer) ParseParamsRequest(req *http.Request) (string, string, string, error) {
	kubeConfig := req.Header.Get("Authorization")
	if config, err := url.PathUnescape(kubeConfig); err == nil {
		kubeConfig = config
	} else {
		return "", "", "", err
	}

	var query string
	vlogsReq := &api.VlogsRequest{}
	err := json.NewDecoder(req.Body).Decode(&vlogsReq)
	if err != nil {
		return "", "", "", errors.New("invalid JSON data,decode error")
	}
	if vlogsReq.Namespace == "" {
		return "", "", "", errors.New("invalid JSON data,namespace not found")
	}
	switch vlogsReq.JsonMode {
	case "":
		return "", "", "", errors.New("invalid JSON data,jsonMode not found")
	case "false":
		query, err = parserKeywordQuery(vlogsReq)
		if err != nil {
			return "", "", "", err
		}
	case "true":
		query, err = parserJsonQuery(vlogsReq)
		if err != nil {
			return "", "", "", err
		}
	default:
		return "", "", "", errors.New("invalid JSON data,jsonMode value err")
	}
}

func parserKeywordQuery(req *api.VlogsRequest) (string, error) {
	var builder strings.Builder
	for _, key := range req.Keyword {
		builder.WriteString(key)
		builder.WriteString(" ")
	}

}

func parserJsonQuery(req *api.VlogsRequest) (string, error) {

}

func paraseQuery(req *api.VlogsRequest) {
	var builder strings.Builder

}

func GetQuery(query *api.VlogsRequest) (string, error) {
	var builder strings.Builder

	// 添加关键词
	builder.WriteString(query.Keyword)
	builder.WriteString(" ")

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
