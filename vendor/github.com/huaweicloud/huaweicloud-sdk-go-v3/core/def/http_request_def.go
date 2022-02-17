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

package def

type HttpRequestDef struct {
	Method         string
	Path           string
	ContentType    string
	RequestFields  []*FieldDef
	ResponseFields []*FieldDef
	Response       interface{}
}

type HttpRequestDefBuilder struct {
	httpRequestDef *HttpRequestDef
}

func NewHttpRequestDefBuilder() *HttpRequestDefBuilder {
	httpRequestDef := &HttpRequestDef{
		RequestFields:  []*FieldDef{},
		ResponseFields: []*FieldDef{},
	}
	HttpRequestDefBuilder := &HttpRequestDefBuilder{
		httpRequestDef: httpRequestDef,
	}
	return HttpRequestDefBuilder
}

func (builder *HttpRequestDefBuilder) WithPath(path string) *HttpRequestDefBuilder {
	builder.httpRequestDef.Path = path
	return builder
}

func (builder *HttpRequestDefBuilder) WithMethod(method string) *HttpRequestDefBuilder {
	builder.httpRequestDef.Method = method
	return builder
}

func (builder *HttpRequestDefBuilder) WithContentType(contentType string) *HttpRequestDefBuilder {
	builder.httpRequestDef.ContentType = contentType
	return builder
}

func (builder *HttpRequestDefBuilder) WithResponse(response interface{}) *HttpRequestDefBuilder {
	builder.httpRequestDef.Response = response
	return builder
}

func (builder *HttpRequestDefBuilder) WithRequestField(field *FieldDef) *HttpRequestDefBuilder {
	builder.httpRequestDef.RequestFields = append(builder.httpRequestDef.RequestFields, field)
	return builder
}

func (builder *HttpRequestDefBuilder) WithResponseField(field *FieldDef) *HttpRequestDefBuilder {
	builder.httpRequestDef.ResponseFields = append(builder.httpRequestDef.ResponseFields, field)
	return builder
}

func (builder *HttpRequestDefBuilder) Build() *HttpRequestDef {
	return builder.httpRequestDef
}
