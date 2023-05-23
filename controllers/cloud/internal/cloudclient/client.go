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
package cloudclient

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
type CloudText struct {
	ID string `json:"_id"`
	ntf.NotificationSpec
}

// data stuct to cloud
type ClientText struct {
	Timestamp int64 `json:"Timestamp"`
}

type CloudClient struct {
	CloudURL string
	Method   string
	//data to cloud
	ctx ClientText

	ResponseBody []byte
	RequestBody  []byte
	Request      *http.Request
	Response     *http.Response
	client       http.Client
}

func (cc *CloudClient) JSONGen() error {
	var err error
	var JSONString []byte
	if JSONString, err = json.Marshal(cc.ctx); err != nil {
		logger.Error("failed to parse ctx to JsonString", err)
		return err
	}
	cc.RequestBody = JSONString
	return nil
}

func (cc *CloudClient) Pull() error {
	if err := cc.CreateRequest(cc.Method, cc.CloudURL); err != nil {
		return err
	}
	if err := cc.SendRequest(); err != nil {
		return err
	}
	return cc.ReadAll()
}

func (cc *CloudClient) CreateRequest(method string, url string) error {
	if err := cc.JSONGen(); err != nil {
		return err
	}
	req, err := http.NewRequest(method, url, bytes.NewBuffer(cc.RequestBody))
	if err != nil {
		logger.Error("CloudClient can't generate a new Http Reaquest ", err)
		return err
	}
	cc.Request = req
	cc.Request.Header.Set("Content-Type", "application/json")
	return nil
}

func (cc *CloudClient) SendRequest() error {
	if cc.Request == nil {
		logger.Info("CloudClient doesn't have a correct HTTP request")
		return errors.New("CloudClient doesn't have a correct HTTP request")
	}
	//logger.Error(cc.CloudURL)
	if err := cc.Do(); err != nil {
		logger.Info("CloudClient failed to send HTTP request ", err)
		return err
	}
	return nil
}

func (cc *CloudClient) Do() error {
	resp, err := cc.client.Do(cc.Request)
	defer cc.Request.Body.Close()
	if err != nil {
		return err
	}
	cc.Response = resp
	return nil
}

func (cc *CloudClient) ReadAll() error {
	defer cc.Response.Body.Close()
	resp, err := io.ReadAll(cc.Response.Body)
	if err != nil {
		logger.Error("CloudClient failed to get HTTP response body ", err)
		return err
	}
	cc.ResponseBody = resp
	return nil
}

func (cc *CloudClient) SetURL(url string) {
	cc.CloudURL = url
}

func (cc *CloudClient) SetMethod(method string) {
	cc.Method = method
}

func (cc *CloudClient) SetTime(time int64) {
	cc.ctx.Timestamp = time
}

func (cc *CloudClient) Clear() {
	cc.RequestBody = nil
	cc.ResponseBody = nil
	cc.Response = nil
}
