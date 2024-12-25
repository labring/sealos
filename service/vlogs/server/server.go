package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/labring/sealos/service/pkg/auth"
	"log"
	"net/http"

	"github.com/labring/sealos/service/pkg/api"
	"github.com/labring/sealos/service/vlogs/request"
)

type VMServer struct {
	Config *Config
}

func NewVMServer(c *Config) (*VMServer, error) {
	vs := &VMServer{
		Config: c,
	}
	return vs, nil
}

// 获取客户端请求的信息
func (vs *VMServer) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	pathPrefix := ""
	switch {
	case req.URL.Path == pathPrefix+"/queryLogsByParams":
		vs.queryLogsByParams(rw, req)
	case req.URL.Path == pathPrefix+"/queryLogsByLogsQl":
		vs.queryLogsByLogsQl(rw, req)
	case req.URL.Path == pathPrefix+"/queryFieldsByParams":
		vs.queryLogsByLogsQl(rw, req)
	default:
		http.Error(rw, "Not found", http.StatusNotFound)
		return
	}
}

func (vs *VMServer) queryLogsByParams(rw http.ResponseWriter, req *http.Request) {
	vr, err := vs.ParseParamsRequest(req)
	if err != nil {
		http.Error(rw, fmt.Sprintf("Bad request (%s)", err), http.StatusBadRequest)
		log.Printf("Bad request (%s)\n", err)
		return
	}
	//todo: auth

	res, err := request.QueryLogsByParams(vr)
	if err != nil {
		http.Error(rw, fmt.Sprintf("Query failed (%s)", err), http.StatusInternalServerError)
		log.Printf("Query failed (%s)\n", err)
		return
	}
	result, err := json.Marshal(res)
	if err != nil {
		http.Error(rw, "Result failed (invalid query expression)", http.StatusInternalServerError)
		log.Printf("Reulst failed (%s)\n", err)
		return
	}
	_, err = rw.Write(result)
	if err != nil {
		return
	}
	return
}

func (vs *VMServer) queryFieldsByParams(rw http.ResponseWriter, req *http.Request) {
	vr, err := vs.ParseLogsRequest(req)
	if err != nil {
		http.Error(rw, fmt.Sprintf("Bad request (%s)", err), http.StatusBadRequest)
		log.Printf("Bad request (%s)\n", err)
		return
	}

	//todo: auth

	res, err := request.QueryLogsByLogsQl(vr)
	if err != nil {
		http.Error(rw, fmt.Sprintf("Query failed (%s)", err), http.StatusInternalServerError)
		log.Printf("Query failed (%s)\n", err)
		return
	}
	result, err := json.Marshal(res)
	if err != nil {
		http.Error(rw, "Result failed (invalid query expression)", http.StatusInternalServerError)
		log.Printf("Reulst failed (%s)\n", err)
		return
	}
	_, err = rw.Write(result)
	if err != nil {
		return
	}
	return
}

func (vs *VMServer) queryLogsByLogsQl(rw http.ResponseWriter, req *http.Request) {
	vr, err := vs.ParseLogsRequest(req)
	if err != nil {
		http.Error(rw, fmt.Sprintf("Bad request (%s)", err), http.StatusBadRequest)
		log.Printf("Bad request (%s)\n", err)
		return
	}

	//todo: auth

	res, err := request.QueryLogsByLogsQl(vr)
	if err != nil {
		http.Error(rw, fmt.Sprintf("Query failed (%s)", err), http.StatusInternalServerError)
		log.Printf("Query failed (%s)\n", err)
		return
	}
	result, err := json.Marshal(res)
	if err != nil {
		http.Error(rw, "Result failed (invalid query expression)", http.StatusInternalServerError)
		log.Printf("Reulst failed (%s)\n", err)
		return
	}
	_, err = rw.Write(result)
	if err != nil {
		return
	}
	return
}

func (vs *VMServer) ParseLogsRequest(req *http.Request) (string, error) {
	if err := req.ParseForm(); err != nil {
		return "", err
	}
	for key, val := range req.Form {
		switch key {
		case "query":
			return val[0], nil
		}
	}
	return "", errors.New("no query parameter found")
}

func (vs *VMServer) ParseParamsRequest(req *http.Request) (*api.VlogsRequest, error) {
	vr := &api.VlogsRequest{}
	if err := req.ParseForm(); err != nil {
		return nil, err
	}
	for key, val := range req.Form {
		switch key {
		case "time":
			vr.Time = val[0]
		case "namespace":
			vr.NS = val[0]
		case "app":
			vr.App = val[0]
		case "pod":
			vr.Pod = val[0]
		case "limit":
			vr.Limit = val[0]
		case "json":
			vr.Json = val[0]
		case "keyword":
			vr.Keyword = val[0]
		}
	}
	if vr.NS == "" {
		return nil, api.ErrUncompleteParam
	}
	return vr, nil
}

func (vs *VMServer) Authenticate(vr *api.VMRequest) error {
	return auth.Authenticate(vr.NS, vr.Pwd)
}
