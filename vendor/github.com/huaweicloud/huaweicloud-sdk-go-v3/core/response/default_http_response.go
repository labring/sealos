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

package response

import (
	"bytes"
	"io/ioutil"
	"net/http"
)

type DefaultHttpResponse struct {
	Response *http.Response
}

func NewDefaultHttpResponse(response *http.Response) *DefaultHttpResponse {
	return &DefaultHttpResponse{Response: response}
}

func (r *DefaultHttpResponse) GetStatusCode() int {
	return r.Response.StatusCode
}

func (r *DefaultHttpResponse) GetHeaders() map[string]string {
	headerParams := map[string]string{}
	for key, values := range r.Response.Header {
		if values == nil || len(values) <= 0 {
			continue
		}
		headerParams[key] = values[0]
	}
	return headerParams
}

func (r *DefaultHttpResponse) GetBody() string {
	body, err := ioutil.ReadAll(r.Response.Body)
	if err != nil {
		return ""
	}
	if err := r.Response.Body.Close(); err == nil {
		r.Response.Body = ioutil.NopCloser(bytes.NewBuffer(body))
	}
	return string(body)
}

func (r *DefaultHttpResponse) GetHeader(key string) string {
	header := r.Response.Header
	return header.Get(key)
}
