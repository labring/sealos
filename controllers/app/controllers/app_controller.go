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
	imgcrtl "github.com/labring/sealos/controllers/imagehub/controllers"
	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/labring/endpoints-operator/library/controller"
	appv1 "github.com/labring/sealos/controllers/app/api/v1"
)

// AppReconcile reconciles a App object
type AppReconcile struct {
	client.Client
	logr.Logger
	finalizer *controller.Finalizer
	Scheme    *runtime.Scheme

	imgdb *imgcrtl.DataHelper
}

//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=images,verbs=get;list;watch
//+kubebuilder:rbac:groups=app.sealos.io,resources=apps,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=app.sealos.io,resources=apps/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=app.sealos.io,resources=apps/finalizers,verbs=update

func (r *AppReconcile) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger.V(1).Info("startapps reconcile for app")
	apps := &appv1.App{}
	if err := r.Get(ctx, req.NamespacedName, apps); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if ok, err := r.finalizer.RemoveFinalizer(ctx, apps, r.doFinalizer); ok {
		return ctrl.Result{}, err
	}

	if ok, err := r.finalizer.AddFinalizer(ctx, apps); ok {
		if err != nil {
			return ctrl.Result{}, err
		}
		return r.reconcile(ctx, apps)
	}
	return ctrl.Result{}, errors.New("reconcile error from Finalizer")
}

func (r *AppReconcile) reconcile(ctx context.Context, obj client.Object) (ctrl.Result, error) {
	r.Logger.V(1).Info("update reconcile controller app", "request", client.ObjectKeyFromObject(obj))
	app, ok := obj.(*appv1.App)
	if !ok {
		return ctrl.Result{}, errors.New("obj convert app is error")
	}
	// get image info
	imgInfo, err := r.imgdb.GetImageInfoByImageName(ctx, app.Spec.Image)
	if err != nil {
		r.Logger.Error(err, "GetImageInfoByImageName error")
		return ctrl.Result{}, err
	}

	// update status
	app.Status.Image = app.Spec.Image
	app.Status.UI = appv1.UIEndPoint{
		Name: app.Spec.Image.GetRepo(),
		URL:  imgInfo.DetailInfo.URL,
		Icon: imgInfo.DetailInfo.Icon,
	}
	if err = r.Status().Update(ctx, app); err != nil {
		return ctrl.Result{Requeue: true}, err
	}
	return ctrl.Result{}, nil
}

func (r *AppReconcile) doFinalizer(ctx context.Context, obj client.Object) error {
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *AppReconcile) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "AppController"
	if r.Client == nil {
		r.Client = mgr.GetClient()
	}
	r.Logger = ctrl.Log.WithName(controllerName)
	if r.finalizer == nil {
		r.finalizer = controller.NewFinalizer(r.Client, appv1.AppFinalizerName)
	}
	r.Scheme = mgr.GetScheme()
	r.imgdb = &imgcrtl.DataHelper{Client: r.Client, Logger: r.Logger}
	r.Logger.V(1).Info("init reconcile controller app")

	return ctrl.NewControllerManagedBy(mgr).
		For(&appv1.App{}).
		Complete(r)
}
