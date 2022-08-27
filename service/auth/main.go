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

package main

import (
	"flag"

	"github.com/labring/sealos/pkg/auth"
	"github.com/labring/sealos/pkg/utils/httpserver"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/service/auth/api"
	"github.com/labring/sealos/service/auth/conf"
)

var configPath string

func main() {
	flag.StringVar(&configPath, "config", "", "Spec the auth service run config file path.")

	flag.Parse()

	if err := conf.InitConfig(configPath); err != nil {
		logger.Fatal("Init config failed: %s", err)
	}
	logger.Info("Loaded configuration completed")

	if err := auth.Init(conf.GlobalConfig.Config); err != nil {
		logger.Fatal("Init auth pkg failed: %s", err)
	}

	logger.Info("Init Auth pkg successfully")
	if err := httpserver.GoRestful(api.RegisterRouter, conf.GlobalConfig.Addr); err != nil {
		logger.Fatal("Run http server failed: %s", err)
	}
}
