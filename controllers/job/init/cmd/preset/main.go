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
