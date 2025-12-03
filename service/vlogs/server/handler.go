package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/labring/sealos/service/pkg/api"
	"github.com/labring/sealos/service/pkg/auth"
	"github.com/labring/sealos/service/vlogs/query"
	"github.com/labring/sealos/service/vlogs/request"
)

func (vl *VLogsServer) queryLogsByParams(rw http.ResponseWriter, req *http.Request) error {
	resp, err := vl.executeQuery(req)
	if err != nil {
		return err
	}
	defer resp.Close()
	_, err = io.Copy(rw, resp)
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
	defer resp.Close()
	body, err := io.ReadAll(resp)
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

func (vl *VLogsServer) executeQuery(req *http.Request) (io.ReadCloser, error) {
	vlogsReq, kubeConfig, err := vl.verifyParams(req)
	if err != nil {
		return nil, fmt.Errorf("bad request (%w)", err)
	}
	err = auth.Authenticate(vlogsReq.Namespace, kubeConfig)
	if err != nil {
		return nil, fmt.Errorf("authentication failed (%w)", err)
	}
	var vlogs query.VLogsQuery
	query, err := vlogs.GetQuery(vlogsReq)
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

func (vl *VLogsServer) verifyParams(req *http.Request) (*api.VlogsLaunchpadRequest, string, error) {
	kubeConfig, err := vl.extractKubeConfig(req)
	if err != nil {
		return nil, "", err
	}
	vlogsReq := &api.VlogsLaunchpadRequest{}
	err = json.NewDecoder(req.Body).Decode(&vlogsReq)
	if err != nil {
		return nil, "", fmt.Errorf("failed to parse request body: %w", err)
	}
	if vlogsReq.Namespace == "" {
		return nil, "", errors.New("failed to get namespace")
	}
	if err := vl.validateTimeParams(vlogsReq.StartTime, vlogsReq.EndTime, vlogsReq.Time); err != nil {
		return nil, "", err
	}
	return vlogsReq, kubeConfig, nil
}

func (vl *VLogsServer) queryDBLogs(rw http.ResponseWriter, req *http.Request) error {
	resp, err := vl.executeDBQuery(req)
	if err != nil {
		return err
	}
	defer resp.Close()
	_, err = io.Copy(rw, resp)
	if err != nil {
		return err
	}
	return nil
}

func (vl *VLogsServer) executeDBQuery(req *http.Request) (io.ReadCloser, error) {
	vlogsReq, kubeConfig, err := vl.verifyDBParams(req)
	if err != nil {
		return nil, fmt.Errorf("bad request (%w)", err)
	}
	err = auth.Authenticate(vlogsReq.Namespace, kubeConfig)
	if err != nil {
		return nil, fmt.Errorf("authentication failed (%w)", err)
	}
	err = auth.AuthenticatePVC(vlogsReq.Namespace, kubeConfig, vlogsReq.Pvc)
	if err != nil {
		return nil, fmt.Errorf("authentication pvc failed (%w)", err)
	}
	var vlogs query.DBLogsQuery
	query, err := vlogs.GetDBQuery(vlogsReq)
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

func (vl *VLogsServer) verifyDBParams(
	req *http.Request,
) (*api.VlogsDatabaseRequest, string, error) {
	kubeConfig, err := vl.extractKubeConfig(req)
	if err != nil {
		return nil, "", err
	}
	vlogsReq := &api.VlogsDatabaseRequest{}
	err = json.NewDecoder(req.Body).Decode(&vlogsReq)
	if err != nil {
		return nil, "", fmt.Errorf("failed to parse request body: %w", err)
	}
	if vlogsReq.Namespace == "" {
		return nil, "", errors.New("failed to get namespace")
	}
	if err := vl.validateTimeParams(vlogsReq.StartTime, vlogsReq.EndTime, vlogsReq.Time); err != nil {
		return nil, "", err
	}
	return vlogsReq, kubeConfig, nil
}
