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

package core

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/auth"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/def"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/impl"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/request"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/response"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/sdkerr"
	jsoniter "github.com/json-iterator/go"
	"io/ioutil"
	"reflect"
	"strings"
)

type HcHttpClient struct {
	endpoint   string
	credential auth.ICredential
	httpClient *impl.DefaultHttpClient
}

func NewHcHttpClient(httpClient *impl.DefaultHttpClient) *HcHttpClient {
	return &HcHttpClient{httpClient: httpClient}
}

func (hc *HcHttpClient) WithEndpoint(endpoint string) *HcHttpClient {
	hc.endpoint = endpoint
	return hc
}

func (hc *HcHttpClient) WithCredential(credential auth.ICredential) *HcHttpClient {
	hc.credential = credential
	return hc
}

func (hc *HcHttpClient) Sync(req interface{}, reqDef *def.HttpRequestDef) (interface{}, error) {
	httpRequest, err := hc.buildRequest(req, reqDef)
	if err != nil {
		return nil, err
	}

	resp, err := hc.httpClient.SyncInvokeHttp(httpRequest)
	if err != nil {
		return nil, err
	}

	return hc.extractResponse(resp, reqDef)
}

func (hc *HcHttpClient) buildRequest(req interface{}, reqDef *def.HttpRequestDef) (*request.DefaultHttpRequest, error) {
	builder := request.NewHttpRequestBuilder().
		WithEndpoint(hc.endpoint).
		WithMethod(reqDef.Method).
		WithPath(reqDef.Path)

	if reqDef.ContentType != "" {
		builder.AddHeaderParam("Content-Type", reqDef.ContentType)
	}
	builder.AddHeaderParam("User-Agent", "huaweicloud-usdk-go/3.0")

	builder, err := hc.fillParamsFromReq(req, reqDef, builder)
	if err != nil {
		return nil, err
	}

	var httpRequest *request.DefaultHttpRequest = builder.Build()

	currentHeaderParams := httpRequest.GetHeaderParams()
	if _, ok := currentHeaderParams["Authorization"]; !ok {
		httpRequest, err = hc.credential.ProcessAuthRequest(hc.httpClient, httpRequest)
		if err != nil {
			return nil, err
		}
	}

	return httpRequest, err
}

func (hc *HcHttpClient) fillParamsFromReq(req interface{}, reqDef *def.HttpRequestDef, builder *request.HttpRequestBuilder) (*request.HttpRequestBuilder, error) {
	t := reflect.TypeOf(req)
	if t.Kind() == reflect.Ptr {
		t = t.Elem()
	}

	attrMaps := hc.GetFieldJsonTags(t)

	for _, fieldDef := range reqDef.RequestFields {
		value, err := hc.GetFieldValueByName(fieldDef.Name, attrMaps, req)
		if err != nil {
			return nil, err
		}

		if !value.IsValid() {
			continue
		}

		v, err := flattenEnumStruct(value)
		if err != nil {
			return nil, err
		}

		switch fieldDef.LocationType {
		case def.Header:
			builder.AddHeaderParam(fieldDef.JsonTag, fmt.Sprintf("%v", v))
		case def.Path:
			builder.AddPathParam(fieldDef.JsonTag, fmt.Sprintf("%v", v))
		case def.Query:
			builder.AddQueryParam(fieldDef.JsonTag, v)
		case def.Body:
			if body, ok := t.FieldByName("Body"); ok {
				builder.WithBody(body.Tag.Get("type"), value.Interface())
			} else {
				builder.WithBody("", value.Interface())
			}
		case def.Form:
			builder.AddFormParam(fieldDef.JsonTag, value.Interface().(def.FormData))
		}
	}

	return builder, nil
}

func (hc *HcHttpClient) GetFieldJsonTags(t reflect.Type) map[string]string {
	attrMaps := make(map[string]string)

	fieldNum := t.NumField()
	for i := 0; i < fieldNum; i++ {
		jsonTag := t.Field(i).Tag.Get("json")
		if jsonTag != "" {
			attrMaps[t.Field(i).Name] = jsonTag
		}
	}
	return attrMaps
}

func (hc *HcHttpClient) GetFieldValueByName(name string, jsonTag map[string]string, structName interface{}) (reflect.Value, error) {
	v := reflect.ValueOf(structName)
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}

	value := v.FieldByName(name)
	if value.Kind() == reflect.Ptr {
		if value.IsNil() {
			if strings.Contains(jsonTag[name], "omitempty") {
				return reflect.ValueOf(nil), nil
			}
			return reflect.ValueOf(nil), errors.New("request field " + name + " read null value")
		}
		return value.Elem(), nil
	}

	return value, nil
}

func flattenEnumStruct(value reflect.Value) (reflect.Value, error) {
	if value.Kind() == reflect.Struct {
		v, e := jsoniter.Marshal(value.Interface())
		if e == nil {
			if strings.HasPrefix(string(v), "\"") {
				return reflect.ValueOf(strings.Trim(string(v), "\"")), nil
			} else {
				return reflect.ValueOf(string(v)), nil
			}
		}
		return reflect.ValueOf(nil), e
	}
	return value, nil
}

func (hc *HcHttpClient) extractResponse(resp *response.DefaultHttpResponse, reqDef *def.HttpRequestDef) (interface{}, error) {
	if resp.GetStatusCode() >= 400 {
		return nil, sdkerr.NewServiceResponseError(resp.Response)
	}

	err := hc.deserializeResponse(resp, reqDef)
	if err != nil {
		return nil, err
	}

	return reqDef.Response, nil
}

func (hc *HcHttpClient) deserializeResponse(resp *response.DefaultHttpResponse, reqDef *def.HttpRequestDef) error {
	t := reflect.TypeOf(reqDef.Response)
	if t.Kind() == reflect.Ptr {
		t = t.Elem()
	}

	v := reflect.ValueOf(reqDef.Response)
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}

	addStatusCode := func() {
		field := v.FieldByName("HttpStatusCode")
		field.Set(reflect.ValueOf(resp.GetStatusCode()))
	}

	if body, ok := t.FieldByName("Body"); ok && body.Type.Name() == "ReadCloser" {
		v.FieldByName("Body").Set(reflect.ValueOf(resp.Response.Body))
		addStatusCode()
		return nil
	}

	data, err := ioutil.ReadAll(resp.Response.Body)
	if err != nil {
		if closeErr := resp.Response.Body.Close(); closeErr != nil {
			return err
		}
		return err
	}
	if err := resp.Response.Body.Close(); err != nil {
		return err
	} else {
		resp.Response.Body = ioutil.NopCloser(bytes.NewBuffer(data))
	}

	hasBody := false
	for _, item := range reqDef.ResponseFields {
		if item.LocationType == def.Header {
			headerErr := hc.deserializeResponseHeaders(resp, reqDef, item)
			if headerErr != nil {
				return sdkerr.ServiceResponseError{
					StatusCode:   resp.GetStatusCode(),
					RequestId:    resp.GetHeader("X-Request-Id"),
					ErrorMessage: headerErr.Error(),
				}
			}
		}

		if item.LocationType == def.Body {
			hasBody = true

			bodyErr := hc.deserializeResponseBody(reqDef, data)
			if bodyErr != nil {
				return sdkerr.ServiceResponseError{
					StatusCode:   resp.GetStatusCode(),
					RequestId:    resp.GetHeader("X-Request-Id"),
					ErrorMessage: bodyErr.Error(),
				}
			}
		}
	}

	if len(data) != 0 && !hasBody {
		err = jsoniter.Unmarshal(data, &reqDef.Response)
		if err != nil {
			return sdkerr.ServiceResponseError{
				StatusCode:   resp.GetStatusCode(),
				RequestId:    resp.GetHeader("X-Request-Id"),
				ErrorMessage: err.Error(),
			}
		}
	}

	addStatusCode()
	return nil
}

func (hc *HcHttpClient) deserializeResponseBody(reqDef *def.HttpRequestDef, data []byte) error {
	dataStr := string(data)

	v := reflect.ValueOf(reqDef.Response)
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}

	t := reflect.TypeOf(reqDef.Response)
	if t.Kind() == reflect.Ptr {
		t = t.Elem()
	}

	if body, ok := t.FieldByName("Body"); ok {
		if body.Type.Kind() == reflect.Ptr && body.Type.Elem().Kind() == reflect.String {
			v.FieldByName("Body").Set(reflect.ValueOf(&dataStr))
		} else if body.Type.Kind() == reflect.String {
			v.FieldByName("Body").Set(reflect.ValueOf(dataStr))
		} else {
			var bodyIns interface{}
			if body.Type.Kind() == reflect.Ptr {
				bodyIns = reflect.New(body.Type.Elem()).Interface()
			} else {
				bodyIns = reflect.New(body.Type).Interface()
			}

			err := json.Unmarshal(data, bodyIns)
			if err != nil {
				return err
			}

			if body.Type.Kind() == reflect.Ptr {
				v.FieldByName("Body").Set(reflect.ValueOf(bodyIns))
			} else {
				v.FieldByName("Body").Set(reflect.ValueOf(bodyIns).Elem())
			}
		}
	}

	return nil
}

func (hc *HcHttpClient) deserializeResponseHeaders(resp *response.DefaultHttpResponse, reqDef *def.HttpRequestDef, item *def.FieldDef) error {
	isPtr, fieldKind := GetFieldInfo(reqDef, item)
	v := reflect.ValueOf(reqDef.Response)
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}
	fieldValue := v.FieldByName(item.Name)
	headerValue := resp.GetHeader(item.JsonTag)

	sdkConverter := converter.StringConverterFactory(fieldKind)
	if sdkConverter == nil {
		return errors.New("failed to convert " + item.JsonTag)
	}

	err := sdkConverter.CovertStringToPrimitiveTypeAndSetField(fieldValue, headerValue, isPtr)
	if err != nil {
		return err
	}

	return nil
}

func GetFieldInfo(reqDef *def.HttpRequestDef, item *def.FieldDef) (bool, string) {
	var fieldKind string
	var isPtr = false
	t := reflect.TypeOf(reqDef.Response)
	if t.Kind() == reflect.Ptr {
		isPtr = true
		t = t.Elem()
	}
	field, _ := t.FieldByName(item.Name)
	if field.Type.Kind() == reflect.Ptr {
		fieldKind = field.Type.Elem().Kind().String()
	} else {
		fieldKind = field.Type.Kind().String()
	}
	return isPtr, fieldKind
}
