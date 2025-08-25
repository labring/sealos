package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"text/template"

	"github.com/labring/sealos/service/pkg/auth"

	"github.com/labring/sealos/service/launchpad/request"
	"github.com/labring/sealos/service/pkg/api"
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

func (vs *VMServer) Authenticate(vr *api.VMRequest) error {
	return auth.Authenticate(vr.NS, vr.Pwd)
}

func (vs *VMServer) DBReq(vr *api.VMRequest) (*api.LaunchpadQueryResult, error) {
	body, err := request.VMNew(vr)
	if err != nil {
		return nil, err
	}
	var result *api.LaunchpadQueryResult
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	log.Print(result)
	return result, nil
}

func (vs *VMServer) ParseRequest(req *http.Request) (*api.VMRequest, error) {
	vr := &api.VMRequest{}

	auth := req.Header.Get("Authorization")

	if pwd, err := url.PathUnescape(auth); err == nil {
		vr.Pwd = pwd
	} else {
		return nil, err
	}
	if vr.Pwd == "" {
		return nil, api.ErrEmptyKubeconfig
	}

	if err := req.ParseForm(); err != nil {
		return nil, err
	}

	for key, val := range req.Form {
		switch key {
		case "step":
			vr.Range.Step = val[0]
		case "start":
			vr.Range.Start = val[0]
		case "end":
			vr.Range.End = val[0]
		case "time":
			vr.Range.Time = val[0]
		case "namespace":
			vr.NS = val[0]
		case "type":
			vr.Type = val[0]
		case "launchPadName":
			vr.LaunchPadName = val[0]
		}
	}

	if vr.NS == "" {
		return nil, api.ErrUncompleteParam
	}

	return vr, nil
}

// 获取客户端请求的信息
func (vs *VMServer) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	pathPrefix := ""
	switch {
	case req.URL.Path == pathPrefix+"/query":
		vs.doReqNew(rw, req)
	default:
		http.Error(rw, "Not found", http.StatusNotFound)
		return
	}
}

func (vs *VMServer) doReqNew(rw http.ResponseWriter, req *http.Request) {
	vr, err := vs.ParseRequest(req)
	if err != nil {
		http.Error(rw, fmt.Sprintf("Bad request (%s)", err), http.StatusBadRequest)
		log.Printf("Bad request (%s)\n", err)
		return
	}

	if err := vs.Authenticate(vr); err != nil {
		http.Error(rw, fmt.Sprintf("Authentication failed (%s)", err), http.StatusInternalServerError)
		log.Printf("Authentication failed (%s)\n", err)
		return
	}

	res, err := vs.DBReq(vr)
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
