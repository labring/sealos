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

package pkg

import (
	"fmt"

	"golang.org/x/oauth2"

	"github.com/labring/sealos/service/auth/pkg/conf"
	"github.com/labring/sealos/service/auth/pkg/sso"
	"github.com/labring/sealos/service/auth/pkg/utils"
)

var (
	ssoClient sso.Client
)

func Init(config conf.Config) error {
	conf.GlobalConfig = config

	var err error
	ssoClient, err = sso.InitSSO()
	if err != nil {
		return fmt.Errorf("init SSO platform failed: %w", err)
	}
	return nil
}

func GetLoginRedirect() (string, error) {
	redirectURL, err := ssoClient.GetRedirectURL()
	if err != nil {
		return "", fmt.Errorf("get redirect url failed: %w", err)
	}
	return redirectURL, nil
}

func GetOAuthToken(state, code string) (*oauth2.Token, error) {
	return ssoClient.GetToken(state, code)
}

func GetUserInfo(accessToken string) (*sso.User, error) {
	return ssoClient.GetUserInfo(accessToken)
}

func GetKubeConfig(accessToken string) (string, error) {
	user, err := ssoClient.GetUserInfo(accessToken)
	if err != nil {
		return "", fmt.Errorf("get user info failed: %w", err)
	}

	err = utils.CreateOrUpdateKubeConfig(user.ID)
	if err != nil {
		return "", fmt.Errorf("create kube config failed: %w", err)
	}
	// Wait for user controller to write kubeconfig into status
	kubeConfig, err := utils.GetKubeConfig(user.ID, 10)
	if err != nil {
		return "", fmt.Errorf("create kubeconfig failed: %w", err)
	}
	return kubeConfig, nil
}
