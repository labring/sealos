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
	content   CloudRequest
	method    string
	url       string
	timestamp int64

	req  *http.Request
	resp *http.Response

	reqBody  []byte
	respBody []byte

	crs []ntf.Notification

	client http.Client
}

type handlerFunc func(*CloudClient, *ntf.Notification, string, CloudResponse)

var handlerMap = map[string]handlerFunc{
	"ns":   (*CloudClient).processNS,
	"adm":  (*CloudClient).processADM,
	"root": (*CloudClient).processROOT,
}

func parse(content CloudRequest) ([]byte, error) {
	var err error
	var JSONString []byte
	if JSONString, err = json.Marshal(content); err != nil {
		logger.Error("failed to parse ctx to JsonString", err)
	}
	return JSONString, err
}

func (cc *CloudClient) createRequest() error {
	var err error
	var body []byte
	var req *http.Request
	if body, err = parse(cc.content); err != nil {
		logger.Error("failed to generate a new Http Reaquest", err)
		return err
	}
	cc.reqBody = body
	req, err = http.NewRequest(cc.method, cc.url, bytes.NewBuffer(cc.reqBody))
	if err != nil {
		logger.Error("CloudClient can't generate a new Http Reaquest ", err)
		return err
	}
	cc.req = req
	cc.req.Header.Set("Content-Type", "application/json")
	return nil
}

func (cc *CloudClient) getResponse() error {
	if cc.req == nil {
		logger.Info("no http request")
		return errors.New("no http request")
	}
	//logger.Error(cc.CloudURL)
	if err := cc.do(); err != nil {
		logger.Info("failed to send HTTP request ", err)
		return err
	}
	return nil
}

func (cc *CloudClient) do() error {
	defer cc.req.Body.Close()
	var err error
	var resp *http.Response
	resp, err = cc.client.Do(cc.req)
	cc.resp = resp
	if err != nil {
		return err
	}
	return nil
}

func (cc *CloudClient) readResponse() error {
	defer cc.resp.Body.Close()
	var err error
	var body []byte
	body, err = io.ReadAll(cc.resp.Body)
	if err != nil {
		logger.Error("CloudClient failed to get HTTP response body ", err)
		return err
	}
	cc.respBody = body
	return nil
}

func (cc *CloudClient) setCloudArgs(method string, url string) {
	cc.method = method
	cc.url = url
	cc.content = CloudRequest{Timestamp: cc.timestamp}
}

// produce the crs data
func (cc *CloudClient) produceCR(namespaceGroup map[string][]string) {
	var events []CloudResponse
	if err := json.Unmarshal(cc.respBody, &events); err != nil {
		logger.Info("failed to decode the json string ", "Error: ", err)
		return
	}
	for _, event := range events {
		if event.Timestamp > cc.timestamp {
			cc.timestamp = event.Timestamp
		}
		for prefix, namespaces := range namespaceGroup {
			cc.buildCR(prefix, namespaces, event)
		}
	}
	return
}

func (cc *CloudClient) buildCR(prefix string, namespaces []string, event CloudResponse) {
	addNameNamespace := handlerMap[prefix]
	for _, namespace := range namespaces {
		if namespace == "" {
			logger.Error("empty namespace")
		}
		var Ntf ntf.Notification
		specCopy(&Ntf, event)
		addNameNamespace(cc, &Ntf, namespace, event)
		cc.crs = append(cc.crs, Ntf)
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

func (cc *CloudClient) getCRs() []ntf.Notification {
	return cc.crs
}

func (cc *CloudClient) SetTime(time int64) {
	cc.timestamp = time
}

func (cc *CloudClient) Reset() {
	cc.reqBody = nil
	cc.respBody = nil
	cc.crs = nil
}

func (cc *CloudClient) IsEmpty() bool {
	logger.Info(cc.respBody)
	return cc.respBody == nil
}
