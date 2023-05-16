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

	"github.com/labring/sealos/pkg/utils/logger"
)

type ClientCTX struct {
	Time string `json:"Time"`
}

type CloudClient struct {
	CloudURL string

	ctx ClientCTX

	ResponseBody []byte
	RequestBody  []byte
	Request      *http.Request
	Response     *http.Response
	client       http.Client
}

func (cc *CloudClient) Get() error {
	if err := cc.CreateRequest(); err != nil {
		return err
	}
	if err := cc.SendRequest(); err != nil {
		return err
	}
	if err := cc.ReadAll(); err != nil {
		return err
	}
	return nil
}

func (cc *CloudClient) CreateRequest() error {
	if err := cc.JsonGen(); err != nil {
		return err
	}
	if req, err := http.NewRequest("POST", cc.CloudURL, bytes.NewReader(cc.RequestBody)); err != nil {
		logger.Error("CloudClient can't generate a new Http Reaquest ", err)
		return err
	} else {
		req.Header.Set("Content-Type", "text/plain")
		cc.Request = req
	}
	return nil
}

func (cc *CloudClient) SendRequest() error {
	if cc.Request == nil {
		logger.Info("CloudClient doesn't have a correct HTTP request")
		return errors.New("CloudClient doesn't have a correct HTTP request")
	}
	if err := cc.Do(); err != nil {
		logger.Info("CloudClient failed to send HTTP request ", err)
		return err
	}
	return nil
}

func (cc *CloudClient) JsonGen() error {
	if JsonString, err := json.Marshal(cc.ctx); err != nil {
		logger.Error("CloudClient error ", "can't parse to JsonString", err)
		return err
	} else {
		cc.RequestBody = JsonString
	}
	return nil
}

func (cc *CloudClient) ReadAll() error {

	defer cc.Response.Body.Close()
	if text, err := io.ReadAll(cc.Response.Body); err != nil {
		logger.Info("CloudClient failed to get HTTP response body ", err)
		return err
	} else {
		cc.ResponseBody = text
	}
	return nil
}

func (cc *CloudClient) Do() error {
	if resp, err := cc.client.Do(cc.Request); err != nil {
		return err
	} else {
		cc.Response = resp
	}
	return nil
}

func (cc *CloudClient) Init() {
	cc.CloudURL = "https://hfx0m9.laf.dev/CloudNotification"
}
