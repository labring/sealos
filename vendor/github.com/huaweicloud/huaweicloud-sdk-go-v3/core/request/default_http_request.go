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

package request

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"reflect"
	"strings"

	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/def"
)

type DefaultHttpRequest struct {
	endpoint string
	path     string
	method   string

	queryParams  map[string]interface{}
	pathParams   map[string]string
	headerParams map[string]string
	formParams   map[string]def.FormData
	body         interface{}

	autoFilledPathParams map[string]string
}

func (httpRequest *DefaultHttpRequest) fillParamsInPath() *DefaultHttpRequest {
	for key, value := range httpRequest.pathParams {
		httpRequest.path = strings.ReplaceAll(httpRequest.path, "{"+key+"}", value)
	}
	for key, value := range httpRequest.autoFilledPathParams {
		httpRequest.path = strings.ReplaceAll(httpRequest.path, "{"+key+"}", value)
	}
	return httpRequest
}

func (httpRequest *DefaultHttpRequest) Builder() *HttpRequestBuilder {
	httpRequestBuilder := HttpRequestBuilder{httpRequest: httpRequest}
	return &httpRequestBuilder
}

func (httpRequest *DefaultHttpRequest) GetEndpoint() string {
	return httpRequest.endpoint
}

func (httpRequest *DefaultHttpRequest) GetPath() string {
	return httpRequest.path
}

func (httpRequest *DefaultHttpRequest) GetMethod() string {
	return httpRequest.method
}

func (httpRequest *DefaultHttpRequest) GetQueryParams() map[string]interface{} {
	return httpRequest.queryParams
}

func (httpRequest *DefaultHttpRequest) GetHeaderParams() map[string]string {
	return httpRequest.headerParams
}

func (httpRequest *DefaultHttpRequest) GetPathPrams() map[string]string {
	return httpRequest.pathParams
}

func (httpRequest *DefaultHttpRequest) GetFormPrams() map[string]def.FormData {
	return httpRequest.formParams
}

func (httpRequest *DefaultHttpRequest) GetBody() interface{} {
	return httpRequest.body
}

func (httpRequest *DefaultHttpRequest) GetBodyToBytes() (*bytes.Buffer, error) {
	buf := &bytes.Buffer{}

	if httpRequest.body != nil {
		v := reflect.ValueOf(httpRequest.body)
		if v.Kind() == reflect.Ptr {
			v = v.Elem()
		}

		if v.Kind() == reflect.String {
			buf.WriteString(v.Interface().(string))
		} else {
			encoder := json.NewEncoder(buf)
			encoder.SetEscapeHTML(false)
			err := encoder.Encode(httpRequest.body)
			if err != nil {
				return nil, err
			}
		}
	}

	return buf, nil
}

func (httpRequest *DefaultHttpRequest) AddQueryParam(key string, value string) {
	httpRequest.queryParams[key] = value
}

func (httpRequest *DefaultHttpRequest) AddPathParam(key string, value string) {
	httpRequest.pathParams[key] = value
}

func (httpRequest *DefaultHttpRequest) AddHeaderParam(key string, value string) {
	httpRequest.headerParams[key] = value
}

func (httpRequest *DefaultHttpRequest) AddFormParam(key string, value def.FormData) {
	httpRequest.formParams[key] = value
}

func (httpRequest *DefaultHttpRequest) ConvertRequest() (*http.Request, error) {
	t := reflect.TypeOf(httpRequest.body)
	if t != nil && t.Kind() == reflect.Ptr {
		t = t.Elem()
	}

	var req *http.Request
	var err error
	if httpRequest.body != nil && t != nil && t.Name() == "File" {
		req, err = httpRequest.convertStreamBody(err, req)
		if err != nil {
			return nil, err
		}
	} else if len(httpRequest.GetFormPrams()) != 0 {
		req, err = httpRequest.covertFormBody()
		if err != nil {
			return nil, err
		}
	} else {
		var buf *bytes.Buffer

		buf, err = httpRequest.GetBodyToBytes()
		if err != nil {
			return nil, err
		}

		req, err = http.NewRequest(httpRequest.GetMethod(), httpRequest.GetEndpoint(), buf)
		if err != nil {
			return nil, err
		}
	}

	httpRequest.fillPath(req)
	httpRequest.fillQueryParams(req)
	httpRequest.fillHeaderParams(req)

	return req, nil
}

func (httpRequest *DefaultHttpRequest) covertFormBody() (*http.Request, error) {
	bodyBuffer := &bytes.Buffer{}
	bodyWriter := multipart.NewWriter(bodyBuffer)

	for k, v := range httpRequest.GetFormPrams() {
		if err := v.Write(bodyWriter, k); err != nil {
			return nil, err
		}
	}

	contentType := bodyWriter.FormDataContentType()
	if err := bodyWriter.Close(); err != nil {
		return nil, err
	}

	req, err := http.NewRequest(httpRequest.GetMethod(), httpRequest.GetEndpoint(), bodyBuffer)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-type", contentType)
	return req, nil
}

func (httpRequest *DefaultHttpRequest) convertStreamBody(err error, req *http.Request) (*http.Request, error) {
	bodyBuffer := &bytes.Buffer{}

	if f, ok := httpRequest.body.(os.File); !ok {
		return nil, errors.New("failed to get stream request body")
	} else {
		buf := bufio.NewReader(&f)
		writer := bufio.NewWriter(bodyBuffer)

		_, err = io.Copy(writer, buf)
		if err != nil {
			return nil, err
		}

		req, err = http.NewRequest(httpRequest.GetMethod(), httpRequest.GetEndpoint(), bodyBuffer)
		if err != nil {
			return nil, err
		}
	}

	return req, nil
}

func (httpRequest *DefaultHttpRequest) fillHeaderParams(req *http.Request) {
	if len(httpRequest.GetHeaderParams()) == 0 {
		return
	}

	for key, value := range httpRequest.GetHeaderParams() {
		if strings.EqualFold(key, "Content-type") && req.Header.Get("Content-type") != "" {
			continue
		}
		req.Header.Add(key, value)
	}
}

func (httpRequest *DefaultHttpRequest) fillQueryParams(req *http.Request) {
	if len(httpRequest.GetQueryParams()) == 0 {
		return
	}

	q := req.URL.Query()
	for key, value := range httpRequest.GetQueryParams() {
		valueWithType := value.(reflect.Value)

		if valueWithType.Kind() == reflect.Slice {
			params := httpRequest.CanonicalSliceQueryParamsToMulti(valueWithType)
			for _, param := range params {
				q.Add(key, param)
			}
		} else if valueWithType.Kind() == reflect.Map {
			params := httpRequest.CanonicalMapQueryParams(key, valueWithType)
			for _, param := range params {
				for k, v := range param {
					q.Add(k, v)
				}
			}
		} else {
			q.Add(key, httpRequest.CanonicalStringQueryParams(valueWithType))
		}
	}

	req.URL.RawQuery = strings.ReplaceAll(strings.ReplaceAll(strings.Trim(q.Encode(), "="), "=&", "&"), "+", "%20")
}

func (httpRequest *DefaultHttpRequest) CanonicalStringQueryParams(value reflect.Value) string {
	return fmt.Sprintf("%v", value)
}

func (httpRequest *DefaultHttpRequest) CanonicalSliceQueryParamsToMulti(value reflect.Value) []string {
	params := make([]string, 0)

	for i := 0; i < value.Len(); i++ {
		if value.Index(i).Kind() == reflect.Struct {
			v, e := json.Marshal(value.Interface())
			if e == nil {
				if strings.HasPrefix(string(v), "\"") {
					params = append(params, strings.Trim(string(v), "\""))
				} else {
					params = append(params, string(v))
				}
			}
		} else {
			params = append(params, httpRequest.CanonicalStringQueryParams(value.Index(i)))
		}
	}

	return params
}

func (httpRequest *DefaultHttpRequest) CanonicalMapQueryParams(key string, value reflect.Value) []map[string]string {
	queryParams := make([]map[string]string, 0)

	for _, k := range value.MapKeys() {
		if value.MapIndex(k).Kind() == reflect.Struct {
			v, e := json.Marshal(value.Interface())
			if e == nil {
				if strings.HasPrefix(string(v), "\"") {
					queryParams = append(queryParams, map[string]string{
						key: strings.Trim(string(v), "\""),
					})
				} else {
					queryParams = append(queryParams, map[string]string{
						key: string(v),
					})
				}
			}
		} else if value.MapIndex(k).Kind() == reflect.Slice {
			params := httpRequest.CanonicalSliceQueryParamsToMulti(value.MapIndex(k))
			if len(params) == 0 {
				queryParams = append(queryParams, map[string]string{
					fmt.Sprintf("%s[%s]", key, k): "",
				})
				continue
			}
			for _, paramValue := range httpRequest.CanonicalSliceQueryParamsToMulti(value.MapIndex(k)) {
				queryParams = append(queryParams, map[string]string{
					fmt.Sprintf("%s[%s]", key, k): paramValue,
				})
			}
		} else if value.MapIndex(k).Kind() == reflect.Map {
			queryParams = append(queryParams, httpRequest.CanonicalMapQueryParams(fmt.Sprintf("%s[%s]", key, k), value.MapIndex(k))...)
		} else {
			queryParams = append(queryParams, map[string]string{
				fmt.Sprintf("%s[%s]", key, k): httpRequest.CanonicalStringQueryParams(value.MapIndex(k)),
			})
		}
	}

	return queryParams
}

func (httpRequest *DefaultHttpRequest) fillPath(req *http.Request) {
	if "" != httpRequest.GetPath() {
		req.URL.Path = httpRequest.GetPath()
	}
}

type HttpRequestBuilder struct {
	httpRequest *DefaultHttpRequest
}

func NewHttpRequestBuilder() *HttpRequestBuilder {
	httpRequest := &DefaultHttpRequest{
		queryParams:          make(map[string]interface{}),
		headerParams:         make(map[string]string),
		pathParams:           make(map[string]string),
		autoFilledPathParams: make(map[string]string),
		formParams:           make(map[string]def.FormData),
	}
	httpRequestBuilder := &HttpRequestBuilder{
		httpRequest: httpRequest,
	}
	return httpRequestBuilder
}

func (builder *HttpRequestBuilder) WithEndpoint(endpoint string) *HttpRequestBuilder {
	builder.httpRequest.endpoint = endpoint
	return builder
}

func (builder *HttpRequestBuilder) WithPath(path string) *HttpRequestBuilder {
	builder.httpRequest.path = path
	return builder
}

func (builder *HttpRequestBuilder) WithMethod(method string) *HttpRequestBuilder {
	builder.httpRequest.method = method
	return builder
}

func (builder *HttpRequestBuilder) AddQueryParam(key string, value interface{}) *HttpRequestBuilder {
	builder.httpRequest.queryParams[key] = value
	return builder
}

func (builder *HttpRequestBuilder) AddPathParam(key string, value string) *HttpRequestBuilder {
	builder.httpRequest.pathParams[key] = value
	return builder
}

func (builder *HttpRequestBuilder) AddAutoFilledPathParam(key string, value string) *HttpRequestBuilder {
	builder.httpRequest.autoFilledPathParams[key] = value
	return builder
}

func (builder *HttpRequestBuilder) AddHeaderParam(key string, value string) *HttpRequestBuilder {
	builder.httpRequest.headerParams[key] = value
	return builder
}

func (builder *HttpRequestBuilder) AddFormParam(key string, value def.FormData) *HttpRequestBuilder {
	builder.httpRequest.formParams[key] = value
	return builder
}

func (builder *HttpRequestBuilder) WithBody(kind string, body interface{}) *HttpRequestBuilder {
	if kind == "multipart" {
		v := reflect.ValueOf(body)
		if v.Kind() == reflect.Ptr {
			v = v.Elem()
		}

		t := reflect.TypeOf(body)
		if t.Kind() == reflect.Ptr {
			t = t.Elem()
		}

		fieldNum := t.NumField()
		for i := 0; i < fieldNum; i++ {
			jsonTag := t.Field(i).Tag.Get("json")
			if jsonTag != "" {
				if v.FieldByName(t.Field(i).Name).IsNil() && strings.Contains(jsonTag, "omitempty") {
					continue
				}
				builder.AddFormParam(strings.Split(jsonTag, ",")[0], v.FieldByName(t.Field(i).Name).Interface().(def.FormData))
			} else {
				builder.AddFormParam(t.Field(i).Name, v.FieldByName(t.Field(i).Name).Interface().(def.FormData))
			}
		}
	} else {
		builder.httpRequest.body = body
	}

	return builder
}

func (builder *HttpRequestBuilder) Build() *DefaultHttpRequest {
	return builder.httpRequest.fillParamsInPath()
}
