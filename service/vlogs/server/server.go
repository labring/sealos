package server

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"

	"github.com/labring/sealos/service/pkg/api"
	"github.com/labring/sealos/service/pkg/auth"
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
	default:
		return nil, errors.New("unknown url path")
	}
}

func (vl *VLogsServer) verifyParams(req *http.Request) (*api.VlogsRequest, string, error) {
	kubeConfig := req.Header.Get("Authorization")
	if config, err := url.PathUnescape(kubeConfig); err == nil {
		kubeConfig = config
	} else {
		return nil, "", fmt.Errorf("failed to PathUnescape : %w", err)
	}
	vlogsReq := &api.VlogsRequest{}
	err := json.NewDecoder(req.Body).Decode(&vlogsReq)
	if err != nil {
		return nil, "", fmt.Errorf("failed to parse request body: %w", err)
	}
	if vlogsReq.Namespace == "" {
		return nil, "", errors.New("failed to get namespace")
	}
	if vlogsReq.StartTime == "" && vlogsReq.EndTime != "" {
		return nil, "", errors.New("failed to get start time")
	}
	if vlogsReq.StartTime != "" && vlogsReq.EndTime == "" {
		return nil, "", errors.New("failed to get end time")
	}
	if vlogsReq.StartTime != "" && vlogsReq.EndTime != "" && vlogsReq.Time != "" {
		return nil, "", errors.New("not to provide 3 time params")
	}
	return vlogsReq, kubeConfig, nil
}

func (vl *VLogsServer) authenticate(namespace, kubeConfig string) error {
	err := auth.Authenticate(namespace, kubeConfig)
	if err != nil {
		return fmt.Errorf("authentication failed (%w)", err)
	}
	return nil
}

func (vl *VLogsServer) executeQuery(req *http.Request) (*http.Response, error) {
	vlogsReq, kubeConfig, err := vl.verifyParams(req)
	if err != nil {
		return nil, fmt.Errorf("bad request (%w)", err)
	}
	err = vl.authenticate(vlogsReq.Namespace, kubeConfig)
	if err != nil {
		return nil, err
	}
	var vlogs VLogsQuery
	query, err := vlogs.getQuery(vlogsReq)
	if err != nil {
		return nil, fmt.Errorf("failed to parse request body: %w", err)
	}
	resp, err := request.QueryLogsByParams(&request.QueryParams{
		Path:      vl.path,
		Query:     query,
		Username:  vl.username,
		Password:  vl.password,
		StartTime: vlogsReq.StartTime,
		EndTime:   vlogsReq.EndTime,
	})
	if err != nil {
		return nil, fmt.Errorf("query failed (%w)", err)
	}
	return resp, nil
}

func (vl *VLogsServer) queryLogsByParams(rw http.ResponseWriter, req *http.Request) error {
	resp, err := vl.executeQuery(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	_, err = io.Copy(rw, resp.Body)
	if err != nil {
		return err
	}
	return nil
}

func (vl *VLogsServer) queryPodList(rw http.ResponseWriter, req *http.Request) error {
	resp, err := vl.executeQuery(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}
	if len(body) == 0 {
		return errors.New("response body is empty")
	}
	podList, err := vl.extractUniquePods(body)
	if err != nil {
		return fmt.Errorf("failed to extract pod list: %w", err)
	}
	rw.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(rw).Encode(podList); err != nil {
		return fmt.Errorf("failed to write response: %w", err)
	}
	return nil
}

func (vl *VLogsServer) extractUniquePods(body []byte) ([]string, error) {
	scanner := bufio.NewScanner(bytes.NewReader(body))
	uniquePods := make(map[string]struct{})
	for scanner.Scan() {
		var entry api.VlogsResponse
		lineBytes := scanner.Bytes()
		err := json.Unmarshal(lineBytes, &entry)
		if err != nil {
			continue
		}
		uniquePods[entry.Pod] = struct{}{}
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading response: %w", err)
	}
	podList := make([]string, 0, len(uniquePods))
	for pod := range uniquePods {
		podList = append(podList, pod)
	}
	return podList, nil
}
