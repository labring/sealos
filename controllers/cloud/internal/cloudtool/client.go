/*
Copyright 2023 yxxchange@163.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

	http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
package cloudtool

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"

	ntf "github.com/labring/sealos/controllers/common/notification/api/v1"
	"github.com/labring/sealos/pkg/utils/logger"
)

// data struct from cloud
type CloudResponse struct {
	ID string `json:"_id"`
	ntf.NotificationSpec
}

// data stuct to cloud
type CloudRequest struct {
	Timestamp int64 `json:"Timestamp"`
}

type CloudClient struct {
	method    string
	url       string
	timestamp int64
}

type handlerFunc func(*CloudClient, *ntf.Notification, string, CloudResponse)

var handlerMap = map[string]handlerFunc{
	"ns-":   (*CloudClient).processNS,
	"adm-":  (*CloudClient).processADM,
	"root-": (*CloudClient).processROOT,
}

func parse(content interface{}) ([]byte, error) {
	var err error
	var JSONString []byte
	if JSONString, err = json.Marshal(content); err != nil {
		logger.Error("failed to parse ctx to JsonString", err)
	}
	return JSONString, err
}

func (cc *CloudClient) createRequest(content interface{}) (*http.Request, error) {
	var err error
	var body []byte
	var req *http.Request
	if body, err = parse(content); err != nil {
		logger.Error("failed to generate a new Http Reaquest", err)
		return nil, err
	}
	req, err = http.NewRequest(cc.method, cc.url, bytes.NewBuffer(body))
	if err != nil {
		logger.Error("CloudClient can't generate a new Http Reaquest ", err)
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	return req, nil
}

func (cc *CloudClient) getResponse(req *http.Request) (*http.Response, error) {
	if req == nil {
		logger.Info("no http request")
		return nil, errors.New("no http request")
	}
	//logger.Error(cc.CloudURL)
	if resp, err := cc.do(req); err != nil {
		logger.Info("failed to send HTTP request ", err)
		return nil, err
	} else {
		return resp, nil
	}
}

func (cc *CloudClient) do(req *http.Request) (*http.Response, error) {
	defer req.Body.Close()
	var err error
	var resp *http.Response
	client := http.Client{}
	resp, err = client.Do(req)
	if err != nil {
		return nil, err
	}
	return resp, nil
}

func (cc *CloudClient) readResponse(resp *http.Response) ([]byte, error) {
	defer resp.Body.Close()
	var err error
	var body []byte
	body, err = io.ReadAll(resp.Body)
	if err != nil {
		logger.Error("CloudClient failed to get HTTP response body ", err)
		return nil, err
	}
	return body, nil
}

func (cc *CloudClient) setCloudArgs(method string, url string) interface{} {
	cc.method = method
	cc.url = url
	content := CloudRequest{Timestamp: cc.timestamp}
	return content
}

// produce the crs data
func (cc *CloudClient) produceCR(namespaceGroup map[string][]string, resp []byte) []ntf.Notification {
	var events []CloudResponse
	var crs []ntf.Notification
	if err := json.Unmarshal(resp, &events); err != nil {
		logger.Info("failed to decode the json string ", "Error: ", err)
		return nil
	}
	for _, event := range events {
		if event.Timestamp > cc.timestamp {
			cc.timestamp = event.Timestamp
		}
		for prefix, namespaces := range namespaceGroup {
			cc.buildCR(prefix, namespaces, event, &crs)
		}
	}
	return crs
}

func (cc *CloudClient) buildCR(prefix string, namespaces []string, event CloudResponse, crs *[]ntf.Notification) {
	addNameNamespace := handlerMap[prefix]
	for _, namespace := range namespaces {
		if namespace == "" {
			logger.Error("empty namespace")
		}
		var Ntf ntf.Notification
		specCopy(&Ntf, event)
		addNameNamespace(cc, &Ntf, namespace, event)
		*crs = append(*crs, Ntf)
	}
}

func specCopy(notification *ntf.Notification, event CloudResponse) {
	notification.Spec.From = "Sealos Cloud"
	notification.Spec.Message = event.Message
	notification.Spec.Title = event.Title
	notification.Spec.Timestamp = event.Timestamp
	notification.Spec.Importance = event.Importance
}

func (cc *CloudClient) processNS(notification *ntf.Notification, namespaceName string, event CloudResponse) {
	prefix := "ntf-"
	//metadata
	notification.Namespace = namespaceName
	notification.Name = prefix + event.ID
}
func (cc *CloudClient) processADM(notification *ntf.Notification, namespaceName string, event CloudResponse) {
	prefix := "ntf-"
	//metadata
	notification.Namespace = namespaceName
	notification.Name = prefix + event.ID
}
func (cc *CloudClient) processROOT(_ *ntf.Notification, _ string, _ CloudResponse) {
	logger.Info("no logic for root-user")
}

func (cc *CloudClient) SetTime(time int64) {
	cc.timestamp = time
}
