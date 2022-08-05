// Copyright © 2022 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package sso

import (
	"strings"

	"github.com/labring/sealos/pkg/auth/conf"
	"github.com/labring/sealos/pkg/utils/logger"

	"golang.org/x/oauth2"
)

type User struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
}

type Client interface {
	GetRedirectURL() (string, error)
	GetToken(state, code string) (*oauth2.Token, error)
	GetUserInfo(accessToken string) (*User, error)
}

type ClientType string

const CasdoorClientType ClientType = "casdoor"

func InitSSO() (Client, error) {
	var client Client
	var err error
	switch ClientType(strings.ToLower(conf.GlobalConfig.SSOType)) {
	case CasdoorClientType:
		client, err = NewCasdoorClient()
	default:
		logger.Warn("No valid SSO platform specified")
	}
	if err != nil {
		logger.Error("Init SSO platform failed")
		return nil, err
	}
	return client, nil
}
