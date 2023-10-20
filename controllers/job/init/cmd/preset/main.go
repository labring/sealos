package main

import (
	"context"
	"os"

	"github.com/labring/sealos/controllers/job/init/internal/util/controller"
	"github.com/labring/sealos/controllers/job/init/internal/util/database"
	"github.com/labring/sealos/controllers/pkg/utils/logger"
)

func main() {
	ctx := context.Background()

	if err := controller.PresetAdminUser(ctx); err != nil {
		logger.Error(err, "preset admin user failed")
		os.Exit(1)
	}

	if err := database.PresetAdminUser(ctx); err != nil {
		logger.Error(err, "preset admin user failed")
		os.Exit(1)
	}
}
