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
	"net/http"
	"strconv"

	"github.com/labring/sealos/pkg/auth/conf"
	"github.com/labring/sealos/pkg/auth/sso"
	"github.com/labring/sealos/pkg/auth/utils"
	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/emicklei/go-restful"
)

var (
	ConfigPath string

	ssoClient          sso.Client
	authHTTPPortString string
)

//Serve start a auth server
func Serve() error {
	err := conf.InitConfig(ConfigPath)
	if err != nil {
		return err
	}
	logger.Info("Loaded configuration")
	ssoClient, err = sso.InitSSO()
	if err != nil {
		return err
	}
	logger.Info("Init SSO platform successfully")
	httpServer()
	return nil
}

func httpServer() {
	container := restful.NewContainer()
	container.Router(restful.CurlyRouter{})
	auth := new(restful.WebService)
	ConfigRegister(auth)
	container.Add(auth)
	//cors
	utils.Cors(container)
	//process port for command
	authHTTPPortString = ":" + strconv.FormatUint(uint64(conf.GlobalConfig.Port), 10)
	logger.Info("start listening on localhost", authHTTPPortString)
	server := &http.Server{Addr: authHTTPPortString, Handler: container}

	logger.Fatal(server.ListenAndServe())
}
