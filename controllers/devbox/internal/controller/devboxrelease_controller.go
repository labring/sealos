/*
Copyright 2024.

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

package controller

import (
	"context"
	"errors"
	"fmt"
	"time"

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"

	devboxv1alpha2 "github.com/labring/sealos/controllers/devbox/api/v1alpha2"
	"github.com/labring/sealos/controllers/devbox/internal/controller/utils/registry"
)

// DevboxreleaseReconciler reconciles a Devboxrelease object
type DevboxreleaseReconciler struct {
	client.Client
	registry.Registry
	Scheme *runtime.Scheme
}

// +kubebuilder:rbac:groups=devbox.sealos.io,resources=devboxreleases,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=devbox.sealos.io,resources=devboxreleases/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=devbox.sealos.io,resources=devboxreleases/finalizers,verbs=update

func (r *DevboxreleaseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx)
	devboxRelease := &devboxv1alpha2.DevboxRelease{}
	if err := r.Client.Get(ctx, req.NamespacedName, devboxRelease); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if devboxRelease.ObjectMeta.DeletionTimestamp.IsZero() {
		if controllerutil.AddFinalizer(devboxRelease, devboxv1alpha2.FinalizerName) {
			if err := r.Update(ctx, devboxRelease); err != nil {
				return ctrl.Result{}, err
			}
		}
	} else {
		if controllerutil.RemoveFinalizer(devboxRelease, devboxv1alpha2.FinalizerName) {
			if err := r.Update(ctx, devboxRelease); err != nil {
				return ctrl.Result{}, err
			}
		}
		return ctrl.Result{}, nil
	}

	logger.Info("Reconciling DevBoxRelease", "devbox", devboxRelease.Spec.DevboxName, "version", devboxRelease.Spec.Version, "phase", devboxRelease.Status.Phase)

	if devboxRelease.Status.Phase == "" {
		devboxRelease.Status.Phase = devboxv1alpha2.DevboxReleasePhasePending
		devbox := &devboxv1alpha2.Devbox{}
		if err := r.Get(ctx, req.NamespacedName, devbox); err != nil {
			logger.Error(err, "Failed to get devbox", "devbox", devboxRelease.Spec.DevboxName)
			return ctrl.Result{}, err
		}
		devboxRelease.Status.OriginalDevboxState = devbox.Spec.State
		devboxRelease.Status.SourceImage = devbox.Status.CommitRecords[devbox.Status.ContentID].CommitImage
		devboxRelease.Status.TargetImage = fmt.Sprintf("%s/%s/%s:%s", r.Registry.Host, devboxRelease.Namespace, devboxRelease.Spec.DevboxName, devboxRelease.Spec.Version)
		if err := r.Status().Update(ctx, devboxRelease); err != nil {
			logger.Error(err, "Failed to update status", "devbox", devboxRelease.Spec.DevboxName, "devboxRelease", devboxRelease.Name, "version", devboxRelease.Spec.Version)
			return ctrl.Result{}, err
		}
		return ctrl.Result{Requeue: true}, nil
	}

	if devboxRelease.Status.Phase == devboxv1alpha2.DevboxReleasePhasePending {
		logger.Info("Creating release tag", "devbox", devboxRelease.Spec.DevboxName, "devboxRelease", devboxRelease.Name, "version", devboxRelease.Spec.Version)
		err := r.Release(ctx, devboxRelease)
		if err != nil && errors.Is(err, registry.ErrorManifestNotFound) {
			logger.Info("Manifest not found, retrying", "devbox", devboxRelease.Spec.DevboxName, "devboxRelease", devboxRelease.Name, "version", devboxRelease.Spec.Version)
			return ctrl.Result{RequeueAfter: time.Second * 10}, nil
		} else if err != nil {
			logger.Error(err, "Failed to create release tag", "devbox", devboxRelease.Spec.DevboxName, "devboxRelease", devboxRelease.Name, "version", devboxRelease.Spec.Version)
			devboxRelease.Status.Phase = devboxv1alpha2.DevboxReleasePhaseFailed
			_ = r.Status().Update(ctx, devboxRelease)
			return ctrl.Result{}, err
		}
		logger.Info("Release tag created", "devbox", devboxRelease.Spec.DevboxName, "devboxRelease", devboxRelease.Name, "version", devboxRelease.Spec.Version)
		devboxRelease.Status.Phase = devboxv1alpha2.DevboxReleasePhaseSuccess
		if err = r.Status().Update(ctx, devboxRelease); err != nil {
			logger.Error(err, "Failed to update status", "devbox", devboxRelease.Spec.DevboxName, "devboxRelease", devboxRelease.Name, "version", devboxRelease.Spec.Version)
			return ctrl.Result{}, err
		}
	}
	logger.Info("Reconciliation complete", "devbox", devboxRelease.Spec.DevboxName, "devboxRelease", devboxRelease.Name, "version", devboxRelease.Spec.Version)
	return ctrl.Result{}, nil
}

// todo: implement this function
func (r *DevboxreleaseReconciler) Release(ctx context.Context, devboxRelease *devboxv1alpha2.DevboxRelease) error {
	r.Registry.ReTag(devboxRelease.Status.SourceImage, devboxRelease.Status.TargetImage)
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *DevboxreleaseReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&devboxv1alpha2.DevboxRelease{}).
		Named("devboxrelease").
		Complete(r)
}
