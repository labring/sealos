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
	"time"

	reference "github.com/google/go-containerregistry/pkg/name"
	devboxv1alpha1 "github.com/labring/sealos/controllers/devbox/api/v1alpha1"
	"github.com/labring/sealos/controllers/devbox/internal/controller/helper"
	"github.com/labring/sealos/controllers/devbox/internal/controller/utils/registry"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

// DevBoxReleaseReconciler reconciles a DevBoxRelease object
type DevBoxReleaseReconciler struct {
	client.Client
	Registry *registry.Client
	Scheme   *runtime.Scheme
}

// +kubebuilder:rbac:groups=devbox.sealos.io,resources=devboxreleases,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=devbox.sealos.io,resources=devboxreleases/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=devbox.sealos.io,resources=devboxreleases/finalizers,verbs=update

func (r *DevBoxReleaseReconciler) Reconcile(
	ctx context.Context,
	req ctrl.Request,
) (ctrl.Result, error) {
	logger := log.FromContext(ctx)
	devboxRelease := &devboxv1alpha1.DevBoxRelease{}
	if err := r.Get(ctx, req.NamespacedName, devboxRelease); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if devboxRelease.DeletionTimestamp.IsZero() {
		if controllerutil.AddFinalizer(devboxRelease, devboxv1alpha1.FinalizerName) {
			if err := r.Update(ctx, devboxRelease); err != nil {
				return ctrl.Result{}, err
			}
		}
	} else {
		if controllerutil.RemoveFinalizer(devboxRelease, devboxv1alpha1.FinalizerName) {
			if err := r.Update(ctx, devboxRelease); err != nil {
				return ctrl.Result{}, err
			}
		}
		return ctrl.Result{}, nil
	}

	logger.Info(
		"Reconciling DevBoxRelease",
		"devbox",
		devboxRelease.Spec.DevboxName,
		"newTag",
		devboxRelease.Spec.NewTag,
		"phase",
		devboxRelease.Status.Phase,
	)

	if devboxRelease.Status.Phase == "" {
		devboxRelease.Status.Phase = devboxv1alpha1.DevboxReleasePhasePending
		err := r.Status().Update(ctx, devboxRelease)
		if err != nil {
			logger.Error(
				err,
				"Failed to update status",
				"devbox",
				devboxRelease.Spec.DevboxName,
				"newTag",
				devboxRelease.Spec.NewTag,
			)
			return ctrl.Result{}, err
		}
		return ctrl.Result{Requeue: true}, nil
	}

	if devboxRelease.Status.Phase == devboxv1alpha1.DevboxReleasePhasePending {
		logger.Info(
			"Creating release tag",
			"devbox",
			devboxRelease.Spec.DevboxName,
			"newTag",
			devboxRelease.Spec.NewTag,
		)
		err := r.CreateReleaseTag(ctx, devboxRelease)
		if err != nil && errors.Is(err, registry.ErrManifestNotFound) {
			logger.Info(
				"Manifest not found, retrying",
				"devbox",
				devboxRelease.Spec.DevboxName,
				"newTag",
				devboxRelease.Spec.NewTag,
			)
			return ctrl.Result{RequeueAfter: time.Second * 10}, nil
		} else if err != nil {
			logger.Error(err, "Failed to create release tag", "devbox", devboxRelease.Spec.DevboxName, "newTag", devboxRelease.Spec.NewTag)
			devboxRelease.Status.Phase = devboxv1alpha1.DevboxReleasePhaseFailed
			_ = r.Status().Update(ctx, devboxRelease)
			return ctrl.Result{}, err
		}
		logger.Info(
			"Release tag created",
			"devbox",
			devboxRelease.Spec.DevboxName,
			"newTag",
			devboxRelease.Spec.NewTag,
		)
		devboxRelease.Status.Phase = devboxv1alpha1.DevboxReleasePhaseSuccess
		if err = r.Status().Update(ctx, devboxRelease); err != nil {
			logger.Error(
				err,
				"Failed to update status",
				"devbox",
				devboxRelease.Spec.DevboxName,
				"newTag",
				devboxRelease.Spec.NewTag,
			)
			return ctrl.Result{}, err
		}
	}
	logger.Info(
		"Reconciliation complete",
		"devbox",
		devboxRelease.Spec.DevboxName,
		"newTag",
		devboxRelease.Spec.NewTag,
	)
	return ctrl.Result{}, nil
}

func (r *DevBoxReleaseReconciler) CreateReleaseTag(
	ctx context.Context,
	devboxRelease *devboxv1alpha1.DevBoxRelease,
) error {
	logger := log.FromContext(ctx)
	devbox := &devboxv1alpha1.Devbox{}
	devboxInfo := types.NamespacedName{
		Name:      devboxRelease.Spec.DevboxName,
		Namespace: devboxRelease.Namespace,
	}
	if err := r.Get(ctx, devboxInfo, devbox); err != nil {
		return err
	}
	// if original image is not set, set it to the last successful commit history
	if devboxRelease.Status.OriginalImage == "" {
		commitHistory := helper.GetLastPredicatedSuccessCommitHistory(devbox)
		if commitHistory == nil {
			return errors.New("no successful commit history found")
		}
		devboxRelease.Status.OriginalImage = commitHistory.Image
	}
	// get image info from devbox last successful commit history image and devbox release original image
	hostName, imageName, oldTag, err := r.GetImageInfo(devbox, devboxRelease)
	if err != nil {
		return err
	}
	logger.Info(
		"Tagging image",
		"host",
		hostName,
		"image",
		imageName,
		"oldTag",
		oldTag,
		"newTag",
		devboxRelease.Spec.NewTag,
	)
	if err = r.Status().Update(ctx, devboxRelease); err != nil {
		logger.Error(
			err,
			"Failed to update status",
			"devbox",
			devboxRelease.Spec.DevboxName,
			"newTag",
			devboxRelease.Spec.NewTag,
		)
		return err
	}
	return r.Registry.TagImage(hostName, imageName, oldTag, devboxRelease.Spec.NewTag)
}

func (r *DevBoxReleaseReconciler) DeleteReleaseTag(
	_ context.Context,
	_ *devboxv1alpha1.DevBoxRelease,
) error {
	// todo only delete CR without doing any other operations
	return nil
}

func (r *DevBoxReleaseReconciler) GetImageInfo(
	devbox *devboxv1alpha1.Devbox,
	devboxRelease *devboxv1alpha1.DevBoxRelease,
) (string, string, string, error) {
	res, err := reference.ParseReference(devboxRelease.Status.OriginalImage)
	if err != nil {
		return "", "", "", err
	}
	registryStr := res.Context().RegistryStr()
	// if registry is empty, use the last successful commit history image's registry
	if registryStr == "" {
		commitHistory := helper.GetLastPredicatedSuccessCommitHistory(devbox)
		if commitHistory == nil {
			return "", "", "", errors.New("no successful commit history found")
		}
		historyRepo, err := reference.ParseReference(commitHistory.Image)
		if err != nil {
			return "", "", "", err
		}
		registryStr = historyRepo.Context().RegistryStr()
	}
	return registryStr, res.Context().RepositoryStr(), res.Identifier(), nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *DevBoxReleaseReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 10}).
		For(&devboxv1alpha1.DevBoxRelease{}).
		Complete(r)
}
