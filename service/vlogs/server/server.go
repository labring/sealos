package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"

	"github.com/labring/sealos/service/pkg/api"
	"github.com/labring/sealos/service/vlogs/request"
)

type VLogsServer struct {
	path     string
	username string
	password string
}

func NewVLogsServer(config *Config) (*VLogsServer, error) {
	vl := &VLogsServer{
		path:     config.Server.Path,
		username: config.Server.Username,
		password: config.Server.Password,
	}
	return vl, nil
}

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
	//kubeConfig, namespace, query, err := vl.generateParamsRequest(req)
	_, _, query, err := vl.generateParamsRequest(req)
	if err != nil {
		http.Error(rw, fmt.Sprintf("Bad request (%s)", err), http.StatusBadRequest)
		log.Printf("Bad request (%s)\n", err)
		return
	}

	//err = auth.Authenticate(namespace, kubeConfig)
	//if err != nil {
	//	http.Error(rw, fmt.Sprintf("Authentication failed (%s)", err), http.StatusInternalServerError)
	//	log.Printf("Authentication failed (%s)\n", err)
	//	return
	//}

	fmt.Println("query: " + query)
	err = request.QueryLogsByParams(vl.path, vl.username, vl.password, query, rw)
	if err != nil {
		http.Error(rw, fmt.Sprintf("Query failed (%s)", err), http.StatusInternalServerError)
		log.Printf("Query failed (%s)\n", err)
		return
	}
	return
}

func (vl *VLogsServer) generateParamsRequest(req *http.Request) (string, string, string, error) {
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
		query, err = generateKeywordQuery(vlogsReq)
		if err != nil {
			return "", "", "", err
		}
	case "true":
		query, err = generateJsonQuery(vlogsReq)
		if err != nil {
			return "", "", "", err
		}
	default:
		return "", "", "", errors.New("invalid JSON data,jsonMode value err")
	}
	return kubeConfig, vlogsReq.Namespace, query, nil
}

func generateKeywordQuery(req *api.VlogsRequest) (string, error) {
	var builder strings.Builder
	builder.WriteString(req.Keyword)
	builder.WriteString(" ")
	stream, err := generateStreamQuery(req)
	if err != nil {
		return "", err
	}
	return builder.String() + stream + generateCommonQuery(req) + generateDropQuery() + generateNumberQuery(req), nil
}

func generateJsonQuery(req *api.VlogsRequest) (string, error) {
	stream, err := generateStreamQuery(req)
	if err != nil {
		return "", err
	}
	var builder strings.Builder
	builder.WriteString(" | unpack_json")
	if len(req.JsonQuery) == 0 {
		return stream + generateCommonQuery(req) + builder.String() + generateDropQuery() + generateNumberQuery(req), nil
	}
	for _, jsonQuery := range req.JsonQuery {
		var item string
		switch jsonQuery.Mode {
		case "=":
			item = fmt.Sprintf("| %s:=%s ", jsonQuery.Key, jsonQuery.Value)
		case "!=":
			item = fmt.Sprintf("| %s:(!=%s) ", jsonQuery.Key, jsonQuery.Value)
		case "~":
			item = fmt.Sprintf("| %s:%s ", jsonQuery.Key, jsonQuery.Value)
		default:
			return "", errors.New("invalid JSON data,jsonMode value err")
		}
		builder.WriteString(item)
	}
	return stream + generateCommonQuery(req) + builder.String() + generateDropQuery() + generateNumberQuery(req), nil
}

func generateStreamQuery(req *api.VlogsRequest) (string, error) {
	var builder strings.Builder
	if len(req.Pod) == 0 && len(req.Container) == 0 {
		item := fmt.Sprintf(`{namespace="%s"}`, req.Namespace)
		builder.WriteString(item)
		return builder.String(), nil
	}
	if len(req.Pod) == 0 {
		for i, container := range req.Container {
			item := fmt.Sprintf(`{container="%s",namespace="%s"}`, container, req.Namespace)
			builder.WriteString(item)
			if i != len(req.Pod)-1 {
				builder.WriteString(" OR")
			}
		}
		return builder.String(), nil
	}
	if len(req.Container) == 0 {
		for i, pod := range req.Pod {
			item := fmt.Sprintf(`{namespace="%s",pod="%s"}`, req.Namespace, pod)
			builder.WriteString(item)
			if i != len(req.Pod)-1 {
				builder.WriteString(" OR")
			}
		}
		return builder.String(), nil
	}
	for _, container := range req.Container {
		for j, pod := range req.Pod {
			item := fmt.Sprintf(`{container="%s",namespace="%s",pod="%s"}`, container, req.Namespace, pod)
			builder.WriteString(item)
			if j != len(req.Pod)-1 {
				builder.WriteString(" OR")
			}
		}
	}
	return builder.String(), nil
}

func generateCommonQuery(req *api.VlogsRequest) string {
	var builder strings.Builder
	item := fmt.Sprintf(`_time:%s app:="%s" `, req.Time, req.App)
	builder.WriteString(item)
	if req.StderrMode == "true" {
		item := fmt.Sprintf(` stream:="stderr" `)
		builder.WriteString(item)
	}
	// if query number,dont use limit param
	if req.NumberMode == "false" {
		item := fmt.Sprintf(`  | limit %s  `, req.Limit)
		builder.WriteString(item)
	}
	return builder.String()
}

func generateDropQuery() string {
	var builder strings.Builder
	builder.WriteString("| Drop _stream_id,_stream,app,container,job,namespace,node,pod ")
	return builder.String()
}

func generateNumberQuery(req *api.VlogsRequest) string {
	var builder strings.Builder
	if req.NumberMode == "true" {
		item := fmt.Sprintf(" | stats by (_time:1%s) count() logs_total ", req.NumberLevel)
		builder.WriteString(item)
		return builder.String()
	} else {
		return ""
	}
}
