/*
Copyright 2022 labring.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controllers

import (
	"context"
	"fmt"
	"time"

	"k8s.io/client-go/tools/record"

	"github.com/labring/sealos/controllers/infra/drivers"

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"
)

// InfraReconciler reconciles a Infra object
type InfraReconciler struct {
	client.Client
	Scheme   *runtime.Scheme
	driver   drivers.Driver
	applier  drivers.Reconcile
	recorder record.EventRecorder
}

//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Infra object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.12.1/pkg/reconcile
func (r *InfraReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	_ = log.FromContext(ctx)
	infra := &infrav1.Infra{}
	if err := r.Get(context.TODO(), req.NamespacedName, infra); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	err := r.applier.ReconcileInstance(infra, r.driver)
	if err != nil {
		r.recorder.Eventf(infra, "Error", "reconcile infra failed", "%v", err)
		return ctrl.Result{}, err
	}
	Hosts, err := r.driver.GetInstances(infra)
	if err != nil {
		r.recorder.Eventf(infra, "Error", "get infra hosts failed", "%v", err)
		return ctrl.Result{}, err
	}

	//status
	infra.Status.Hosts = Hosts
	infra.Status.SSH = infra.Spec.SSH
	var cstZone = time.FixedZone("CST", 8*3600)
	infra.Status.CreateTime = time.Now().In(cstZone).Format("2006-01-02 15:04:05")
	infra.Status.RegionIDs = infra.Spec.RegionIDs
	infra.Status.AvailabilityZone = infra.Spec.AvailabilityZone
	infra.Status.Connections = ""
OuterLoop:
	for _, v := range infra.Status.Hosts {
		for _, role := range v.Roles {
			if role == "master" && len(v.Metadata) > 0 {
				infra.Status.Connections = v.Metadata[0].IP[1].IPValue + ":22"
				break OuterLoop
			}
		}
	}
	infra.Status.Name = infra.Name
	infra.Status.ID = infra.UID
	if err = r.Status().Update(ctx, infra); err != nil {
		r.recorder.Eventf(infra, "Error", "infra status update failed", "%v", err)
		return ctrl.Result{}, err
	}
	if err = r.Update(ctx, infra); err != nil {
		r.recorder.Eventf(infra, "Error", "infra update failed", "%v", err)
		return ctrl.Result{}, err
	}

	r.recorder.Eventf(infra, "Normal", "Created", "create infra success: %s", infra.Name)
	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *InfraReconciler) SetupWithManager(mgr ctrl.Manager) error {
	driver, err := drivers.NewDriver()
	if err != nil {
		return fmt.Errorf("infra controller new driver failed: %v", err)
	}
	r.driver = driver
	r.applier = &drivers.Applier{}
	r.recorder = mgr.GetEventRecorderFor("salos-infra-controller")

	return ctrl.NewControllerManagedBy(mgr).
		For(&infrav1.Infra{}).
		Complete(r)
}
