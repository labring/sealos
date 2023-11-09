// Copyright © 2023 sealos.
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
	"context"
	"errors"
	"os"

	"github.com/labring/sealos/controllers/job/init/internal/util/controller"
	"github.com/labring/sealos/controllers/job/init/internal/util/database"
	utilserror "github.com/labring/sealos/controllers/job/init/internal/util/errors"
	"github.com/labring/sealos/controllers/pkg/utils/logger"
)

func main() {
	ctx := context.Background()

	if err := controller.PresetAdminUser(ctx); err != nil {
		logger.Error(err, "preset admin user in kubernetes failed")
		os.Exit(1)
	}
	logger.Info("preset admin user in kubernetes successfully")

	if err := database.PresetAdminUser(ctx); err != nil {
		if errors.Is(err, utilserror.ErrAdminExists) {
			logger.Info("admin user already exists in database")
		} else {
			logger.Error(err, "preset admin user in database failed")
			os.Exit(1)
		}
	}
	logger.Info("preset admin user in database successfully")
}
