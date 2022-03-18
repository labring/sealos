// Copyright 2020 Huawei Technologies Co.,Ltd.
//
// Licensed to the Apache Software Foundation (ASF) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The ASF licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

package sdkerr

import (
	"bytes"
	"fmt"
	jsoniter "github.com/json-iterator/go"
	"io/ioutil"
	"net/http"

	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"
)

type CredentialsTypeError struct {
	ErrorMessage string
}

func NewCredentialsTypeError(msg string) *CredentialsTypeError {
	c := &CredentialsTypeError{
		ErrorMessage: msg,
	}
	return c
}

func (c *CredentialsTypeError) Error() string {
	return fmt.Sprintf("{\"ErrorMessage\": \"%s\"}", c.ErrorMessage)
}

type ConnectionError struct {
	ErrorMessage string
}

func NewConnectionError(msg string) *ConnectionError {
	c := &ConnectionError{
		ErrorMessage: msg,
	}
	return c
}

func (c *ConnectionError) Error() string {
	return fmt.Sprintf("{\"ErrorMessage\": \"%s\"}", c.ErrorMessage)
}

type RequestTimeoutError struct {
	ErrorMessage string
}

func NewRequestTimeoutError(msg string) *RequestTimeoutError {
	rt := &RequestTimeoutError{
		ErrorMessage: msg,
	}
	return rt
}

func (rt *RequestTimeoutError) Error() string {
	return fmt.Sprintf("{\"ErrorMessage\": \"%s\"}", rt.ErrorMessage)
}

type ServiceResponseError struct {
	StatusCode   int    `json:"status_code"`
	RequestId    string `json:"request_id"`
	ErrorCode    string `json:"error_code"`
	ErrorMessage string `json:"error_message"`
}

func NewServiceResponseError(resp *http.Response) *ServiceResponseError {
	sr := &ServiceResponseError{
		StatusCode: resp.StatusCode,
		RequestId:  resp.Header.Get("X-Request-Id"),
	}

	data, err := ioutil.ReadAll(resp.Body)
	if err == nil {
		dataBuf := make(map[string]string)
		err := jsoniter.Unmarshal(data, &dataBuf)
		if err != nil {
			dataBuf := make(map[string]map[string]string)
			err := jsoniter.Unmarshal(data, &dataBuf)
			for _, value := range dataBuf {
				if err == nil && value["code"] != "" && value["message"] != "" {
					sr.ErrorCode = value["code"]
					sr.ErrorMessage = value["message"]
				} else if err == nil && value["error_code"] != "" && value["error_msg"] != "" {
					sr.ErrorCode = value["error_code"]
					sr.ErrorMessage = value["error_msg"]
				}
			}
		} else {
			if sr.ErrorCode == "" && sr.ErrorMessage == "" {
				sr.ErrorCode = dataBuf["error_code"]
				sr.ErrorMessage = dataBuf["error_msg"]
			}

			if sr.ErrorCode == "" && sr.ErrorMessage == "" {
				sr.ErrorCode = dataBuf["code"]
				sr.ErrorMessage = dataBuf["message"]
			}
		}

		if sr.ErrorMessage == "" {
			sr.ErrorMessage = string(data)
		}
	}

	if err := resp.Body.Close(); err == nil {
		resp.Body = ioutil.NopCloser(bytes.NewBuffer(data))
	}

	return sr
}

func (sr ServiceResponseError) Error() string {
	data, err := utils.Marshal(sr)
	if err != nil {
		return fmt.Sprintf("{\"ErrorMessage\": \"%s\",\"ErrorCode\": \"%s\"}", sr.ErrorMessage, sr.ErrorCode)
	}
	return fmt.Sprintf(string(data))
}
