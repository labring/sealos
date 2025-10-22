package server

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/labring/sealos/service/pkg/api"
	"net/http"
	"net/url"
)

func (vl *VLogsServer) extractKubeConfig(req *http.Request) (string, error) {
	kubeConfig := req.Header.Get("Authorization")
	if config, err := url.PathUnescape(kubeConfig); err == nil {
		kubeConfig = config
	} else {
		return "", fmt.Errorf("failed to PathUnescape : %w", err)
	}
	return kubeConfig, nil
}

func (vl *VLogsServer) validateTimeParams(startTime, endTime, time string) error {
	if startTime == "" && endTime != "" {
		return errors.New("failed to get start time")
	}
	if startTime != "" && endTime == "" {
		return errors.New("failed to get end time")
	}
	if startTime != "" && endTime != "" && time != "" {
		return errors.New("not to provide 3 time params")
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
