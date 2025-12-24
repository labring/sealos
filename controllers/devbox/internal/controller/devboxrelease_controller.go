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

	devboxv1alpha2 "github.com/labring/sealos/controllers/devbox/api/v1alpha2"
	"github.com/labring/sealos/controllers/devbox/internal/controller/utils/registry"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/util/retry"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
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

func (r *DevboxreleaseReconciler) Reconcile(
	ctx context.Context,
	req ctrl.Request,
) (ctrl.Result, error) {
	logger := log.FromContext(ctx)
	devboxRelease := &devboxv1alpha2.DevBoxRelease{}
	if err := r.Get(ctx, req.NamespacedName, devboxRelease); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if devboxRelease.DeletionTimestamp.IsZero() {
		// Add finalizer with retry
		err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
			latestRelease := &devboxv1alpha2.DevBoxRelease{}
			if err := r.Get(ctx, req.NamespacedName, latestRelease); err != nil {
				return err
			}
			if controllerutil.AddFinalizer(latestRelease, devboxv1alpha2.FinalizerName) {
				return r.Update(ctx, latestRelease)
			}
			return nil
		})
		if err != nil {
			return ctrl.Result{}, err
		}
	} else {
		// Remove finalizer with retry
		err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
			latestRelease := &devboxv1alpha2.DevBoxRelease{}
			if err := r.Get(ctx, req.NamespacedName, latestRelease); err != nil {
				return client.IgnoreNotFound(err)
			}
			if controllerutil.RemoveFinalizer(latestRelease, devboxv1alpha2.FinalizerName) {
				return r.Update(ctx, latestRelease)
			}
			return nil
		})
		if err != nil {
			return ctrl.Result{}, err
		}
		return ctrl.Result{}, nil
	}

	logger.Info(
		"Reconciling DevBoxRelease",
		"devbox",
		devboxRelease.Spec.DevboxName,
		"version",
		devboxRelease.Spec.Version,
		"phase",
		devboxRelease.Status.Phase,
	)

	devbox := &devboxv1alpha2.Devbox{}
	if err := r.Get(ctx, client.ObjectKey{Namespace: devboxRelease.Namespace, Name: devboxRelease.Spec.DevboxName}, devbox); err != nil {
		logger.Error(err, "Failed to get devbox", "devbox", devboxRelease.Spec.DevboxName)
		return ctrl.Result{}, err
	}
	// if devboxRelease.Status.Phase is success, skip release
	if devboxRelease.Status.Phase == devboxv1alpha2.DevBoxReleasePhaseSuccess {
		logger.Info(
			"DevBoxRelease is already released, skipping release",
			"devbox",
			devboxRelease.Spec.DevboxName,
			"devboxRelease",
			devboxRelease.Name,
			"version",
			devboxRelease.Spec.Version,
		)
		return ctrl.Result{}, nil
	}

	// if devbox is running, skip release
	if devbox.Status.State == devboxv1alpha2.DevboxStateRunning ||
		devbox.Status.State == devboxv1alpha2.DevboxStatePaused {
		logger.Info(
			"Devbox is running or paused, skipping release",
			"devbox",
			devboxRelease.Spec.DevboxName,
			"devboxRelease",
			devboxRelease.Name,
			"version",
			devboxRelease.Spec.Version,
		)
		return ctrl.Result{RequeueAfter: time.Second * 10}, nil
	}
	if devboxRelease.Status.Phase == "" {
		// Initialize release phase with retry
		sourceImage := devbox.Status.CommitRecords[devbox.Status.ContentID].BaseImage
		targetImage := fmt.Sprintf(
			"%s/%s/%s:%s",
			r.Host,
			devboxRelease.Namespace,
			devboxRelease.Spec.DevboxName,
			devboxRelease.Spec.Version,
		)
		err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
			latestRelease := &devboxv1alpha2.DevBoxRelease{}
			if err := r.Get(ctx, client.ObjectKeyFromObject(devboxRelease), latestRelease); err != nil {
				return err
			}
			latestRelease.Status.Phase = devboxv1alpha2.DevBoxReleasePhasePending
			latestRelease.Status.OriginalDevboxState = devbox.Spec.State
			latestRelease.Status.SourceImage = sourceImage
			latestRelease.Status.TargetImage = targetImage
			return r.Status().Update(ctx, latestRelease)
		})
		if err != nil {
			logger.Error(
				err,
				"Failed to update status",
				"devbox",
				devboxRelease.Spec.DevboxName,
				"devboxRelease",
				devboxRelease.Name,
				"version",
				devboxRelease.Spec.Version,
			)
			return ctrl.Result{}, err
		}
		return ctrl.Result{Requeue: true}, nil
	}
	if devboxRelease.Status.Phase == devboxv1alpha2.DevBoxReleasePhasePending {
		logger.Info(
			"Creating release tag",
			"devbox",
			devboxRelease.Spec.DevboxName,
			"devboxRelease",
			devboxRelease.Name,
			"version",
			devboxRelease.Spec.Version,
		)
		err := r.Release(ctx, devboxRelease)
		if err != nil && errors.Is(err, registry.ErrManifestNotFound) {
			logger.Info(
				"Manifest not found, retrying",
				"devbox",
				devboxRelease.Spec.DevboxName,
				"devboxRelease",
				devboxRelease.Name,
				"version",
				devboxRelease.Spec.Version,
			)
			return ctrl.Result{RequeueAfter: time.Second * 10}, nil
		} else if err != nil {
			logger.Error(err, "Failed to create release tag", "devbox", devboxRelease.Spec.DevboxName, "devboxRelease", devboxRelease.Name, "version", devboxRelease.Spec.Version)
			// Update status to failed with retry
			_ = retry.RetryOnConflict(retry.DefaultRetry, func() error {
				latestRelease := &devboxv1alpha2.DevBoxRelease{}
				if err := r.Get(ctx, client.ObjectKeyFromObject(devboxRelease), latestRelease); err != nil {
					return err
				}
				latestRelease.Status.Phase = devboxv1alpha2.DevBoxReleasePhaseFailed
				return r.Status().Update(ctx, latestRelease)
			})
			return ctrl.Result{}, err
		}
		logger.Info(
			"Release tag created",
			"devbox",
			devboxRelease.Spec.DevboxName,
			"devboxRelease",
			devboxRelease.Name,
			"version",
			devboxRelease.Spec.Version,
		)
		// Update status to success with retry
		err = retry.RetryOnConflict(retry.DefaultRetry, func() error {
			latestRelease := &devboxv1alpha2.DevBoxRelease{}
			if err := r.Get(ctx, client.ObjectKeyFromObject(devboxRelease), latestRelease); err != nil {
				return err
			}
			latestRelease.Status.Phase = devboxv1alpha2.DevBoxReleasePhaseSuccess
			return r.Status().Update(ctx, latestRelease)
		})
		if err != nil {
			logger.Error(
				err,
				"Failed to update status",
				"devbox",
				devboxRelease.Spec.DevboxName,
				"devboxRelease",
				devboxRelease.Name,
				"version",
				devboxRelease.Spec.Version,
			)
			return ctrl.Result{}, err
		}
		if devboxRelease.Spec.StartDevboxAfterRelease {
			err = retry.RetryOnConflict(retry.DefaultRetry, func() error {
				devbox := &devboxv1alpha2.Devbox{}
				if err := r.Get(ctx, client.ObjectKey{Namespace: devboxRelease.Namespace, Name: devboxRelease.Spec.DevboxName}, devbox); err != nil {
					return err
				}
				logger.Info(
					"Starting devbox after release",
					"devbox",
					devboxRelease.Spec.DevboxName,
					"devboxRelease",
					devboxRelease.Name,
					"version",
					devboxRelease.Spec.Version,
				)
				devbox.Spec.State = devboxv1alpha2.DevboxStateRunning
				if err = r.Update(ctx, devbox); err != nil {
					logger.Error(
						err,
						"Failed to update devbox",
						"devbox",
						devboxRelease.Spec.DevboxName,
						"devboxRelease",
						devboxRelease.Name,
						"version",
						devboxRelease.Spec.Version,
					)
					return err
				}
				return nil
			})
			if err != nil {
				logger.Error(
					err,
					"Failed to update devbox",
					"devbox",
					devboxRelease.Spec.DevboxName,
					"devboxRelease",
					devboxRelease.Name,
					"version",
					devboxRelease.Spec.Version,
				)
				return ctrl.Result{}, err
			}
		}
	}
	logger.Info(
		"Reconciliation complete",
		"devbox",
		devboxRelease.Spec.DevboxName,
		"devboxRelease",
		devboxRelease.Name,
		"version",
		devboxRelease.Spec.Version,
	)
	return ctrl.Result{}, nil
}

func (r *DevboxreleaseReconciler) Release(
	ctx context.Context,
	devboxRelease *devboxv1alpha2.DevBoxRelease,
) error {
	logger := log.FromContext(ctx)
	if err := r.ReTag(devboxRelease.Status.SourceImage, devboxRelease.Status.TargetImage); err != nil {
		logger.Error(
			err,
			"Failed to re-tag image",
			"devbox",
			devboxRelease.Spec.DevboxName,
			"devboxRelease",
			devboxRelease.Name,
			"version",
			devboxRelease.Spec.Version,
		)
		return err
	}
	logger.Info(
		"Image re-tagged",
		"devbox",
		devboxRelease.Spec.DevboxName,
		"devboxRelease",
		devboxRelease.Name,
		"version",
		devboxRelease.Spec.Version,
	)
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *DevboxreleaseReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&devboxv1alpha2.DevBoxRelease{}).
		Named("devboxrelease").
		Complete(r)
}
