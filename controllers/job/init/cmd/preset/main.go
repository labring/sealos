package main

import (
	"context"

	"os"

	"github.com/labring/sealos/controllers/job/init/internal/util/database"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
)

var (
	scheme    = runtime.NewScheme()
	presetLog = ctrl.Log.WithName("preset")
)

func init() {
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))
	utilruntime.Must(userv1.AddToScheme(scheme))
}

func main() {
	// TODO do something
	err := database.PresetUser(&presetLog, context.Background())
	if err != nil {
		presetLog.Error(err, "failed to preset root user")
		os.Exit(1)
	}
	presetLog.Info("preset root user successfully")
}
