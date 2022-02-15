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

package config

import (
	"context"
	"fmt"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/httphandler"
	"net"
	"time"
)

const DefaultTimeout = 120 * time.Second
const DefaultRetries = 0
const DefaultIgnoreSSLVerification = false

type DialContext func(ctx context.Context, network string, addr string) (net.Conn, error)

type HttpConfig struct {
	DialContext           DialContext
	Timeout               time.Duration
	Retries               int
	HttpProxy             *Proxy
	IgnoreSSLVerification bool
	HttpHandler           *httphandler.HttpHandler
}

func DefaultHttpConfig() *HttpConfig {
	return &HttpConfig{
		Timeout:               DefaultTimeout,
		Retries:               DefaultRetries,
		IgnoreSSLVerification: DefaultIgnoreSSLVerification,
	}
}

func (config *HttpConfig) WithDialContext(dial DialContext) *HttpConfig {
	config.DialContext = dial
	return config
}

func (config *HttpConfig) WithTimeout(timeout time.Duration) *HttpConfig {
	config.Timeout = timeout
	return config
}

func (config *HttpConfig) WithRetries(retries int) *HttpConfig {
	config.Retries = retries
	return config
}

func (config *HttpConfig) WithIgnoreSSLVerification(ignore bool) *HttpConfig {
	config.IgnoreSSLVerification = ignore
	return config
}

func (config *HttpConfig) WithHttpHandler(handler *httphandler.HttpHandler) *HttpConfig {
	config.HttpHandler = handler
	return config
}

func (config *HttpConfig) WithProxy(proxy *Proxy) *HttpConfig {
	config.HttpProxy = proxy
	return config
}

type Proxy struct {
	Schema   string
	Host     string
	Port     int
	Username string
	Password string
}

func NewProxy() *Proxy {
	return &Proxy{}
}

func (p *Proxy) WithSchema(schema string) *Proxy {
	p.Schema = schema
	return p
}

func (p *Proxy) WithHost(host string) *Proxy {
	p.Host = host
	return p
}

func (p *Proxy) WithPort(port int) *Proxy {
	p.Port = port
	return p
}

func (p *Proxy) WithUsername(name string) *Proxy {
	p.Username = name
	return p
}

func (p *Proxy) WithPassword(pwd string) *Proxy {
	p.Password = pwd
	return p
}

func (p *Proxy) GetProxyUrl() string {
	var proxyUrl string
	if p.Username != "" {
		proxyUrl = fmt.Sprintf("%s://%s:%s@%s", p.Schema, p.Username, p.Password, p.Host)
	} else {
		proxyUrl = fmt.Sprintf("%s://%s", p.Schema, p.Host)
	}
	if p.Port != 0 {
		proxyUrl = fmt.Sprintf("%s:%d", proxyUrl, p.Port)
	}
	return proxyUrl
}
