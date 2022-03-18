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
	"fmt"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/auth"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/auth/env"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/config"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/impl"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/region"
	"reflect"
	"strings"
)

type HcHttpClientBuilder struct {
	CredentialsType []string
	credentials     auth.ICredential
	endpoint        string
	httpConfig      *config.HttpConfig
	region          *region.Region
}

func NewHcHttpClientBuilder() *HcHttpClientBuilder {
	hcHttpClientBuilder := &HcHttpClientBuilder{
		CredentialsType: []string{"basic.Credentials"},
	}
	return hcHttpClientBuilder
}

func (builder *HcHttpClientBuilder) WithCredentialsType(credentialsType string) *HcHttpClientBuilder {
	builder.CredentialsType = strings.Split(credentialsType, ",")
	return builder
}

func (builder *HcHttpClientBuilder) WithEndpoint(endpoint string) *HcHttpClientBuilder {
	builder.endpoint = endpoint
	return builder
}

func (builder *HcHttpClientBuilder) WithRegion(region *region.Region) *HcHttpClientBuilder {
	builder.region = region
	return builder
}

func (builder *HcHttpClientBuilder) WithHttpConfig(httpConfig *config.HttpConfig) *HcHttpClientBuilder {
	builder.httpConfig = httpConfig
	return builder
}

func (builder *HcHttpClientBuilder) WithCredential(iCredential auth.ICredential) *HcHttpClientBuilder {
	builder.credentials = iCredential
	return builder
}

func (builder *HcHttpClientBuilder) Build() *HcHttpClient {
	if builder.httpConfig == nil {
		builder.httpConfig = config.DefaultHttpConfig()
	}

	if builder.credentials == nil {
		builder.credentials = env.LoadCredentialFromEnv(builder.CredentialsType[0])
	}

	match := false
	givenCredentialsType := reflect.TypeOf(builder.credentials).String()
	for _, credentialsType := range builder.CredentialsType {
		if credentialsType == givenCredentialsType {
			match = true
			break
		}
	}

	if !match {
		panic(fmt.Sprintf("Need credential type is %s, actually is %s", builder.CredentialsType, reflect.TypeOf(builder.credentials).String()))
	}

	defaultHttpClient := impl.NewDefaultHttpClient(builder.httpConfig)

	if builder.region != nil {
		builder.endpoint = builder.region.Endpoint
		builder.credentials = builder.credentials.ProcessAuthParams(defaultHttpClient, builder.region.Id)
	}

	if !strings.HasPrefix(builder.endpoint, "http") {
		builder.endpoint = "https://" + builder.endpoint
	}

	hcHttpClient := NewHcHttpClient(defaultHttpClient).WithEndpoint(builder.endpoint).WithCredential(builder.credentials)
	return hcHttpClient
}
