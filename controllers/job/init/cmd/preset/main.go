package main

import (
	"context"
	"os"

	"github.com/labring/sealos/controllers/job/init/internal/util/controller"
	"github.com/labring/sealos/controllers/job/init/internal/util/database"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"

	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
)

var (
	scheme    = runtime.NewScheme()
	presetLog = ctrl.Log.WithName("Preset")
)

func init() {
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))
	utilruntime.Must(userv1.AddToScheme(scheme))
}

func main() {
	ctx := context.Background()

	if err := controller.PresetAdminUser(ctx); err != nil {
		presetLog.Error(err, "failed to preset admin user in kubernetes")
		os.Exit(1)
	}

	if err := database.PresetAdminUser(ctx); err != nil {
		presetLog.Error(err, "failed to preset admin user in database")
		os.Exit(1)
	}
	presetLog.Info("preset admin user successfully")
}
