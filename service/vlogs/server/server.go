package server

import (
	"errors"
	"fmt"
	"github.com/labring/sealos/service/vlogs/config"
	"log/slog"
	"net/http"
)

type VLogsServer struct {
	path     string
	username string
	password string
}

func NewVLogsServer(config *config.Config) (*VLogsServer, error) {
	vl := &VLogsServer{
		path:     config.Server.Path,
		username: config.Server.Username,
		password: config.Server.Password,
	}
	return vl, nil
}

func (vl *VLogsServer) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	query, err := vl.queryConvert(req)
	if err != nil {
		http.Error(
			rw,
			fmt.Sprintf("query %s error: %s", req.URL.Path, err),
			http.StatusInternalServerError,
		)
		return
	}
	err = query(rw, req)
	if err != nil {
		http.Error(
			rw,
			fmt.Sprintf("query %s error: %s", req.URL.Path, err),
			http.StatusInternalServerError,
		)
		slog.Error("%s error: %s", req.URL.Path, err)
		return
	}
}

func (vl *VLogsServer) queryConvert(
	req *http.Request,
) (func(rw http.ResponseWriter, req *http.Request) error, error) {
	switch req.URL.Path {
	case "/queryLogsByParams":
		return vl.queryLogsByParams, nil
	case "/queryPodList":
		return vl.queryPodList, nil
	case "/queryLogsByPod":
		return vl.queryDBLogs, nil
	default:
		return nil, errors.New("unknown url path")
	}
}
