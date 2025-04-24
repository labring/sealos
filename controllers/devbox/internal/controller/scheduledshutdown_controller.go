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
	"time"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	devboxv1alpha1 "github.com/labring/sealos/controllers/devbox/api/v1alpha1"
)

// ScheduledShutdownReconciler reconciles a ScheduledShutdown object
type ScheduledShutdownReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

// +kubebuilder:rbac:groups=devbox.sealos.io,resources=scheduledshutdowns,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=devbox.sealos.io,resources=scheduledshutdowns/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=devbox.sealos.io,resources=scheduledshutdowns/finalizers,verbs=update
// +kubebuilder:rbac:groups=devbox.sealos.io,resources=devboxes,verbs=get;list;watch;update;patch

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
func (r *ScheduledShutdownReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx)
	var scheduledShutdown devboxv1alpha1.ScheduledShutdown
	if err := r.Get(ctx, req.NamespacedName, &scheduledShutdown); err != nil {
		if errors.IsNotFound(err) {
			logger.Info("ScheduledShutdown resource not found. Ignoring since object must be deleted")
			return ctrl.Result{}, nil
		}
		logger.Error(err, "Failed to get ScheduledShutdown")
		return ctrl.Result{}, err
	}

	if scheduledShutdown.Status.State == devboxv1alpha1.ShutdownStateCompleted {
		logger.Info("Shutdown already completed, skipping reconciliation")
		return ctrl.Result{}, nil
	}

	var devbox devboxv1alpha1.Devbox
	if err := r.Get(ctx, types.NamespacedName{Name: scheduledShutdown.Spec.DevBoxName, Namespace: scheduledShutdown.Namespace}, &devbox); err != nil {
		if errors.IsNotFound(err) {
			logger.Error(err, "DevBox not found", "DevBoxName", scheduledShutdown.Spec.DevBoxName)
			return r.updateStatus(ctx, &scheduledShutdown, devboxv1alpha1.ShutdownStateUnknown)
		}
		logger.Error(err, "Failed to get DevBox", "DevBoxName", scheduledShutdown.Spec.DevBoxName)
		return ctrl.Result{}, err
	}
	now := time.Now()
	shutdownTime := scheduledShutdown.Spec.ShutdownTime.Time
	if now.After(shutdownTime) {
		logger.Info("Shutdown time reached, performing shutdown", "DevBoxName", scheduledShutdown.Spec.DevBoxName, "ShutdownType", scheduledShutdown.Spec.ShutdownType)
		//shutdown
		if err := r.performShutdown(ctx, &devbox, scheduledShutdown.Spec.ShutdownType); err != nil {
			logger.Error(err, "Failed to perform shutdown", "DevBoxName", scheduledShutdown.Spec.DevBoxName)
			return r.updateStatus(ctx, &scheduledShutdown, devboxv1alpha1.ShutdownStateUnknown)
		}
		return r.updateStatus(ctx, &scheduledShutdown, devboxv1alpha1.ShutdownStateCompleted)
	}

	waitDuration := shutdownTime.Sub(now)
	logger.Info("Shutdown time not yet reached, scheduling requeue", "DevBoxName", scheduledShutdown.Spec.DevBoxName, "ShutdownTime", shutdownTime, "WaitDuration", waitDuration)

	if scheduledShutdown.Status.State != devboxv1alpha1.ShutdownStatePending {
		if _, err := r.updateStatus(ctx, &scheduledShutdown, devboxv1alpha1.ShutdownStatePending); err != nil {
			return ctrl.Result{}, err
		}
	}

	return ctrl.Result{RequeueAfter: waitDuration}, nil
}

func (r *ScheduledShutdownReconciler) performShutdown(ctx context.Context, devbox *devboxv1alpha1.Devbox, shutdownType devboxv1alpha1.ShutdownType) error {
	logger := log.FromContext(ctx)
	logger.Info("Performing shutdown operation", "DevBoxName", devbox.Name, "ShutdownType", shutdownType)
	switch shutdownType {
	case devboxv1alpha1.Stopped:
		devbox.Spec.State = devboxv1alpha1.DevboxStateStopped
	default:
		logger.Error(errors.NewBadRequest("Unknown shutdown type"), "DevBoxName", devbox.Name, "ShutdownType", shutdownType)
	}
	return r.Update(ctx, devbox)
}

func (r *ScheduledShutdownReconciler) updateStatus(ctx context.Context, scheduledShutdown *devboxv1alpha1.ScheduledShutdown, state devboxv1alpha1.ShutdownState) (ctrl.Result, error) {
	logger := log.FromContext(ctx)
	logger.Info("Updating ScheduledShutdown status", "State", state)
	scheduledShutdown.Status.State = state
	if err := r.Status().Update(ctx, scheduledShutdown); err != nil {
		logger.Error(err, "Failed to update ScheduledShutdown status")
		return ctrl.Result{}, err
	}
	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ScheduledShutdownReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&devboxv1alpha1.ScheduledShutdown{}).
		Named("scheduledshutdown").
		Complete(r)
}
