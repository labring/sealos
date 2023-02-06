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
	"github.com/pkg/errors"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

// ImageReconciler reconciles a Image object
type ImageReconciler struct {
	client.Client
	logr.Logger
	db        *DataHelper
	finalizer *controller.Finalizer
	Recorder  record.EventRecorder
	Scheme    *runtime.Scheme
}

//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=images,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=images/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=images/finalizers,verbs=update
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=repositories,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=repositories/status,verbs=get;update;patch

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Image object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.13.0/pkg/reconcile
func (r *ImageReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger.V(1).Info("start reconcile for image")
	img := &imagehubv1.Image{}
	if err := r.Get(ctx, req.NamespacedName, img); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if ok, err := r.finalizer.RemoveFinalizer(ctx, img, r.doFinalizer); ok {
		return ctrl.Result{}, err
	}

	if ok, err := r.finalizer.AddFinalizer(ctx, img); ok {
		if err != nil {
			return ctrl.Result{}, err
		}
		return r.reconcile(ctx, img)
	}
	return ctrl.Result{}, errors.New("reconcile error from Finalizer")
}

func (r *ImageReconciler) reconcile(ctx context.Context, obj client.Object) (ctrl.Result, error) {
	r.Logger.V(1).Info("update reconcile controller image", "request", client.ObjectKeyFromObject(obj))
	img, ok := obj.(*imagehubv1.Image)
	if !ok {
		return ctrl.Result{}, errors.New("obj convert Image is error")
	}
	// create repo and SetControllerReference.
	repo := &imagehubv1.Repository{}
	repo.Name = img.Spec.Name.ToRepoName().ToMetaName()
	err := r.Get(ctx, client.ObjectKeyFromObject(repo), repo)
	if err != nil && apierrors.IsNotFound(err) {
		repo.Spec = imagehubv1.RepositorySpec{
			Name:      img.Spec.Name.ToRepoName(),
			IsPrivate: false,
		}
		if err := r.Create(ctx, repo); err != nil {
			r.Logger.Error(err, "error in create")
			return ctrl.Result{Requeue: true}, err
		}
	} else if err != nil {
		return ctrl.Result{Requeue: true}, err
	}
	update, err := controllerutil.CreateOrUpdate(ctx, r.Client, img, func() error {
		if err := controllerutil.SetControllerReference(repo, img, r.Scheme); err != nil {
			r.Logger.Error(err, "error in SetControllerReference")
			return err
		}
		return nil
	})
	if err != nil {
		r.Logger.Error(err, "image reconcile update repo error")
		return ctrl.Result{Requeue: true}, err
	}
	r.Logger.V(1).Info("image reconcile update image:", "changes", update)
	return ctrl.Result{}, nil
}

func (r *ImageReconciler) doFinalizer(ctx context.Context, obj client.Object) error {
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ImageReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "ImageController"
	if r.Client == nil {
		r.Client = mgr.GetClient()
	}
	r.Logger = ctrl.Log.WithName(controllerName)
	if r.Recorder == nil {
		r.Recorder = mgr.GetEventRecorderFor(controllerName)
	}
	if r.finalizer == nil {
		r.finalizer = controller.NewFinalizer(r.Client, imagehubv1.ImgFinalizerName)
	}
	r.Scheme = mgr.GetScheme()
	r.db = &DataHelper{r.Client, r.Logger}
	r.Logger.V(1).Info("init reconcile controller image")

	return ctrl.NewControllerManagedBy(mgr).
		For(&imagehubv1.Image{}).
		Complete(r)
}
