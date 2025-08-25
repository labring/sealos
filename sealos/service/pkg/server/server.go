package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"text/template"

	"github.com/labring/sealos/service/pkg/auth"

	"github.com/labring/sealos/service/pkg/api"
	"github.com/labring/sealos/service/pkg/request"
)

type PromServer struct {
	Config *Config
}

func NewPromServer(c *Config) (*PromServer, error) {
	ps := &PromServer{
		Config: c,
	}
	return ps, nil
}

func (ps *PromServer) Authenticate(pr *api.PromRequest) error {
	return auth.Authenticate(pr.NS, pr.Pwd)
}

func (ps *PromServer) Request(pr *api.PromRequest) (*api.QueryResult, error) {
	body, err := request.PrometheusPre(pr)
	if err != nil {
		return nil, err
	}
	var result *api.QueryResult
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	return result, err
}

func (ps *PromServer) DBReq(pr *api.PromRequest) (*api.QueryResult, error) {
	body, err := request.PrometheusNew(pr)
	if err != nil {
		return nil, err
	}
	var result *api.QueryResult
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	return result, nil
}

func (ps *PromServer) ParseRequest(req *http.Request) (*api.PromRequest, error) {
	pr := &api.PromRequest{}

	auth := req.Header.Get("Authorization")

	if pwd, err := url.PathUnescape(auth); err == nil {
		pr.Pwd = pwd
	} else {
		return nil, err
	}
	if pr.Pwd == "" {
		return nil, api.ErrEmptyKubeconfig
	}

	if err := req.ParseForm(); err != nil {
		return nil, err
	}

	for key, val := range req.Form {
		switch key {
		case "query":
			pr.Query = val[0]
		case "step":
			pr.Range.Step = val[0]
		case "start":
			pr.Range.Start = val[0]
		case "end":
			pr.Range.End = val[0]
		case "time":
			pr.Range.Time = val[0]
		case "namespace":
			pr.NS = val[0]
		case "type":
			pr.Type = val[0]
		case "app":
			pr.Cluster = val[0]
		}
	}

	if pr.NS == "" || pr.Query == "" {
		return nil, api.ErrUncompleteParam
	}

	return pr, nil
}

// 获取客户端请求的信息
func (ps *PromServer) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	pathPrefix := ""
	switch {
	case req.URL.Path == pathPrefix+"/query": // 将废弃
		ps.doReqPre(rw, req)
	case req.URL.Path == pathPrefix+"/q":
		ps.doReqNew(rw, req)
	default:
		http.Error(rw, "Not found", http.StatusNotFound)
		return
	}
}

func (ps *PromServer) doReqNew(rw http.ResponseWriter, req *http.Request) {
	pr, err := ps.ParseRequest(req)
	if err != nil {
		http.Error(rw, fmt.Sprintf("Bad request (%s)", err), http.StatusBadRequest)
		log.Printf("Bad request (%s)\n", err)
		return
	}

	if err := ps.Authenticate(pr); err != nil {
		http.Error(rw, fmt.Sprintf("Authentication failed (%s)", err), http.StatusInternalServerError)
		log.Printf("Authentication failed (%s)\n", err)
		return
	}

	res, err := ps.DBReq(pr)
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

	rw.Header().Set("Content-Type", "application/json")

	tmpl := template.New("responseTemplate").Delims("{{", "}}")
	tmpl, err = tmpl.Parse(`{{.}}`)
	if err != nil {
		log.Printf("template failed: %s\n", err)
		http.Error(rw, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	if err = tmpl.Execute(rw, string(result)); err != nil {
		log.Printf("Reulst failed: %s\n", err)
		http.Error(rw, "Internal Server Error", http.StatusInternalServerError)
		return
	}
}

func (ps *PromServer) doReqPre(rw http.ResponseWriter, req *http.Request) {
	pr, err := ps.ParseRequest(req)
	if err != nil {
		http.Error(rw, fmt.Sprintf("Bad request (%s)", err), http.StatusBadRequest)
		log.Printf("Bad request (%s)\n", err)
		return
	}

	if err := ps.Authenticate(pr); err != nil {
		http.Error(rw, fmt.Sprintf("Authentication failed (%s)", err), http.StatusInternalServerError)
		log.Printf("Authentication failed (%s)\n", err)
		log.Printf("Kubeconfig (%s)\n", pr.Pwd)
	}

	res, err := ps.Request(pr)
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

	rw.Header().Set("Content-Type", "application/json")

	tmpl := template.New("responseTemplate").Delims("{{", "}}")
	tmpl, err = tmpl.Parse(`{{.}}`)
	if err != nil {
		log.Printf("template failed: %s\n", err)
		http.Error(rw, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	if err = tmpl.Execute(rw, string(result)); err != nil {
		log.Printf("Reulst failed: %s\n", err)
		http.Error(rw, "Internal Server Error", http.StatusInternalServerError)
		return
	}
}
