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

package api

import (
	restful "github.com/emicklei/go-restful/v3"
	"github.com/labring/sealos/pkg/auth"
)

// RegisterRouter Register auth Router
func RegisterRouter(webService *restful.WebService) {
	webService.Path("/").
		Consumes("*/*").
		Produces(restful.MIME_JSON)
	// redirect to login page
	webService.Route(webService.GET("/login").To(handlerLogin))
	// SSO callback, get token
	webService.Route(webService.GET("/token").To(handlerToken))
	// return user info
	webService.Route(webService.GET("/userinfo").To(handlerUserInfo))
	// generate kubeconfig according to user info
	webService.Route(webService.GET("/kubeconfig").To(handlerKubeConfig))
}

func handlerLogin(_ *restful.Request, response *restful.Response) {
	redirectURL, err := auth.GetLoginRedirect()
	if err != nil {
		_ = response.WriteError(500, err)
		return
	}
	response.Header().Set("Location", redirectURL)
	response.WriteHeader(302)
}

func handlerToken(request *restful.Request, response *restful.Response) {
	state := request.QueryParameter("state")
	code := request.QueryParameter("code")
	if state == "" || code == "" {
		_ = response.WriteError(500, nil)
		return
	}

	oauthToken, err := auth.GetOAuthToken(state, code)
	if err != nil {
		_ = response.WriteError(500, err)
		return
	}

	_ = response.WriteEntity(oauthToken)
}

func handlerUserInfo(request *restful.Request, response *restful.Response) {
	accessToken := request.QueryParameter("access_token")
	userInfo, err := auth.GetUserInfo(accessToken)
	if err != nil {
		_ = response.WriteError(500, err)
		return
	}

	_ = response.WriteEntity(userInfo)
}

func handlerKubeConfig(request *restful.Request, response *restful.Response) {
	accessToken := request.QueryParameter("access_token")
	if accessToken == "" {
		_ = response.WriteError(500, nil)
		return
	}

	kubeConfig, err := auth.GetKubeConfig(accessToken)
	if err != nil {
		_ = response.WriteError(500, err)
		return
	}

	_ = response.WriteEntity(map[string]string{
		"config": kubeConfig,
	})
}
