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

package auth

import (
	"github.com/pkg/errors"
	"golang.org/x/oauth2"

	"github.com/labring/sealos/pkg/auth/conf"
	"github.com/labring/sealos/pkg/auth/sso"
	"github.com/labring/sealos/pkg/auth/utils"
)

var (
	ssoClient sso.Client
)

func Init(config conf.Config) error {
	conf.GlobalConfig = config

	var err error
	ssoClient, err = sso.InitSSO()
	if err != nil {
		return errors.Wrap(err, "Init SSO platform failed")
	}
	return nil
}

func GetLoginRedirect() (string, error) {
	redirectURL, err := ssoClient.GetRedirectURL()
	return redirectURL, errors.Wrap(err, "Get redirect url failed")
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
		return "", errors.Wrap(err, "Get user info failed")
	}

	err = utils.CreateOrUpdateKubeConfig(user.ID)
	if err != nil {
		return "", errors.Wrap(err, "Create kube config failed")
	}
	// Wait for user controller to write kubeconfig into status
	kubeConfig, err := utils.GetKubeConfig(user.ID, 10)
	if err != nil {
		return "", errors.Wrap(err, "Create kubeconfig failed")
	}
	return kubeConfig, nil
}
