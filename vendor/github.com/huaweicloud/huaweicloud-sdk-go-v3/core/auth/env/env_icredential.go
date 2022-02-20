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

package env

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/auth"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/auth/basic"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/auth/global"
	"os"
)

const (
	AkEnvName        = "HUAWEICLOUD_SDK_AK"
	SkEnvName        = "HUAWEICLOUD_SDK_SK"
	ProjectIdEnvName = "HUAWEICLOUD_SDK_PROJECT_ID"
	DomainIdEnvName  = "HUAWEICLOUD_SDK_DOMAIN_ID"

	BasicCredentialType  = "basic.Credentials"
	GlobalCredentialType = "global.Credentials"
)

func LoadCredentialFromEnv(defaultType string) auth.ICredential {
	ak := os.Getenv(AkEnvName)
	sk := os.Getenv(SkEnvName)

	if defaultType == BasicCredentialType {
		projectId := os.Getenv(ProjectIdEnvName)
		return basic.NewCredentialsBuilder().
			WithAk(ak).
			WithSk(sk).
			WithProjectId(projectId).
			Build()
	} else if defaultType == GlobalCredentialType {
		domainId := os.Getenv(DomainIdEnvName)
		return global.NewCredentialsBuilder().
			WithAk(ak).
			WithSk(sk).
			WithDomainId(domainId).
			Build()
	} else {
		return nil
	}
}
