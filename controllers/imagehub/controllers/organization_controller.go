/*
Copyright 2022.

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

	"github.com/go-logr/logr"
	"github.com/labring/endpoints-operator/library/controller"
	imagehubv1 "github.com/labring/sealos/controllers/imagehub/api/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// OrganizationReconciler reconciles a Organization object
type OrganizationReconciler struct {
	client.Client
	logr.Logger
	Scheme   *runtime.Scheme
	Recorder record.EventRecorder

	db *DataHelper
}

//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=images,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=repositories,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=organizations,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=organizations,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=organizations/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=organizations/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Organization object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.13.0/pkg/reconcile
func (r *OrganizationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger.V(1).Info("start reconcile for image")

	// get image
	org := &imagehubv1.Organization{}
	ctr := controller.Controller{
		Client:   r.Client,
		Logger:   r.Logger,
		Eventer:  r.Recorder,
		Operator: r,
		Gvk: schema.GroupVersionKind{
			Group:   imagehubv1.GroupVersion.Group,
			Version: imagehubv1.GroupVersion.Version,
			Kind:    "Organization",
		},
		FinalizerName: imagehubv1.OrgFinalizerName,
	}
	org.APIVersion = ctr.Gvk.GroupVersion().String()
	org.Kind = ctr.Gvk.Kind

	return ctr.Run(ctx, req, org)
}

func (r *OrganizationReconciler) Update(ctx context.Context, req ctrl.Request, gvk schema.GroupVersionKind, obj client.Object) (ctrl.Result, error) {
	return ctrl.Result{}, nil
}

func (r *OrganizationReconciler) Delete(ctx context.Context, req ctrl.Request, gvk schema.GroupVersionKind, obj client.Object) error {
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *OrganizationReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "OrgController"

	r.Logger = ctrl.Log.WithName(controllerName)
	r.Scheme = mgr.GetScheme()
	if r.Client == nil {
		r.Client = mgr.GetClient()
	}
	if r.Recorder == nil {
		r.Recorder = mgr.GetEventRecorderFor(controllerName)
	}
	r.db = &DataHelper{r.Client, r.Logger}

	r.Logger.V(1).Info("init reconcile controller org")

	return ctrl.NewControllerManagedBy(mgr).
		For(&imagehubv1.Organization{}).
		Complete(r)
}
