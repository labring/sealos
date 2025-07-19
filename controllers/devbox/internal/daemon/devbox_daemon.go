package daemon

import (
	"context"

	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
	"sigs.k8s.io/controller-runtime/pkg/source"

	devboxv1alpha1 "github.com/labring/sealos/controllers/devbox/api/v1alpha1"
)

type DevboxDaemon struct {
	Client   client.Client
	Scheme   *runtime.Scheme
	Recorder record.EventRecorder
}

func (d *DevboxDaemon) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	return ctrl.Result{}, nil
}

func (d *DevboxDaemon) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WatchesRawSource(source.TypedSource[reconcile.Request]{
			Source: &source.Kind{Type: &devboxv1alpha1.Devbox{}},
		}).
		Complete(d)
}
