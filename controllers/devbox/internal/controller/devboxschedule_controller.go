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
	"fmt"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	"time"

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	devboxv1alpha1 "github.com/labring/sealos/controllers/devbox/api/v1alpha1"
)

// DevBoxScheduleReconciler reconciles a DevBoxSchedule object
type DevBoxScheduleReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

// +kubebuilder:rbac:groups=devbox.sealos.io,resources=devboxschedules,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=devbox.sealos.io,resources=devboxschedules/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=devbox.sealos.io,resources=devboxschedules/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the DevBoxSchedule object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.20.0/pkg/reconcile
func (r *DevBoxScheduleReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx)
	var devboxSchedule devboxv1alpha1.DevBoxSchedule
	if err := r.Get(ctx, req.NamespacedName, &devboxSchedule); err != nil {
		if errors.IsNotFound(err) {
			// DevBoxSchedule resource not found, likely deleted after reconcile request.
			logger.Info("DevBoxSchedule resource not found, ignoring")
			return ctrl.Result{}, nil
		}
		logger.Error(err, "Failed to get DevBoxSchedule")
		return ctrl.Result{}, err
	}
	var devbox devboxv1alpha1.Devbox
	switch devboxSchedule.Spec.State {
	case devboxv1alpha1.ScheduleStateCompleted:
		logger.Info("Schedule already completed, deleting the CR")
		if err := r.Delete(ctx, &devboxSchedule); err != nil {
			logger.Error(err, "Failed to delete completed DevboxSchedule")
			return ctrl.Result{}, err
		}
		logger.Info("Successfully deleted completed DevboxSchedule")
		return ctrl.Result{}, nil
	case devboxv1alpha1.ScheduleStatePending:
		if err := r.Get(ctx, types.NamespacedName{Name: devboxSchedule.Spec.DevBoxName, Namespace: devboxSchedule.Namespace}, &devbox); err != nil {
			if errors.IsNotFound(err) {
				logger.Error(err, "DevBox not found", "DevBoxName", devboxSchedule.Spec.DevBoxName)
				return r.updateStatus(ctx, &devboxSchedule, devboxv1alpha1.ScheduleStateNotFound)
			}
			logger.Error(err, "Failed to get DevBox", "DevBoxName", devboxSchedule.Spec.DevBoxName)
			return ctrl.Result{}, err
		}
		var foundOwnerRef bool
		for _, ownerRef := range devboxSchedule.OwnerReferences {
			if ownerRef.Kind == "DevBox" && ownerRef.Name == devbox.Name && ownerRef.UID == devbox.UID {
				foundOwnerRef = true
				break
			}
		}
		if !foundOwnerRef {
			logger.Error(fmt.Errorf("DevBox not found in ownerReferences or UID mismatch: devbox=%s", devbox.UID),
				"DevBox is not properly referenced by DevBoxSchedule")
			return r.updateStatus(ctx, &devboxSchedule, devboxv1alpha1.ScheduleStateNotMatch)
		}
		// Check if the scheduled time has been reached
		if r.checkScheduleReached(ctx, &devboxSchedule) {
			logger.Info("Schedule time reached, performing operator", "DevBoxName", devboxSchedule.Spec.DevBoxName, "ScheduleType", devboxSchedule.Spec.ScheduleType)
			// Execute the scheduled operation (start or shutdown DevBox)
			if err := r.performSchedule(ctx, &devbox, devboxSchedule.Spec.ScheduleType); err != nil {
				logger.Error(err, "Failed to perform scheduled operation", "DevBoxName", devboxSchedule.Spec.DevBoxName)
				return r.updateStatus(ctx, &devboxSchedule, devboxv1alpha1.ScheduleStateUnknown)
			}
			return r.updateStatus(ctx, &devboxSchedule, devboxv1alpha1.ScheduleStateCompleted)
		} else {
			requeueAfter := calculateRequeueTime(devboxSchedule.Spec.ScheduleTime.Time)
			logger.Info("Schedule time not yet reached, scheduling requeue", "DevBoxName", devboxSchedule.Spec.DevBoxName, "ScheduleTime", devboxSchedule.Spec.ScheduleTime.Time, "RequeueAfter", requeueAfter, "NextCheck", time.Now().Add(requeueAfter))
			return ctrl.Result{RequeueAfter: requeueAfter}, nil
		}
	default:
		logger.Info("DevBoxSchedule in unexpected state", "state", devboxSchedule.Spec.State, "devBoxName", devboxSchedule.Spec.DevBoxName)
	}
	return ctrl.Result{}, nil
}

func (r *DevBoxScheduleReconciler) updateStatus(ctx context.Context, scheduledShutdown *devboxv1alpha1.DevBoxSchedule, state devboxv1alpha1.ScheduleState) (ctrl.Result, error) {
	logger := log.FromContext(ctx)
	logger.Info("Updating ScheduledDevbox status", "State", state)
	scheduledShutdown.Spec.State = state
	if err := r.Status().Update(ctx, scheduledShutdown); err != nil {
		logger.Error(err, "Failed to update ScheduledShutdown status")
		return ctrl.Result{}, err
	}
	return ctrl.Result{}, nil
}

func (r *DevBoxScheduleReconciler) performSchedule(ctx context.Context, devbox *devboxv1alpha1.Devbox, scheduleType devboxv1alpha1.ScheduleType) error {
	logger := log.FromContext(ctx)
	logger.Info("Performing schedule operation", "DevBoxName", devbox.Name, "ScheduleType", scheduleType)
	switch scheduleType {
	case devboxv1alpha1.ScheduleStopped:
		devbox.Spec.State = devboxv1alpha1.DevboxStateStopped
		return r.Update(ctx, devbox)
	default:
		logger.Error(errors.NewBadRequest("Unknown shutdown type"), "DevBoxName", devbox.Name, "ScheduleType", scheduleType)
		return errors.NewBadRequest("Unknown shutdown type")
	}
}

func (r *DevBoxScheduleReconciler) checkScheduleReached(ctx context.Context, devboxSchedule *devboxv1alpha1.DevBoxSchedule) bool {
	return time.Now().After(devboxSchedule.Spec.ScheduleTime.Time)
}

func calculateRequeueTime(scheduleTime time.Time) time.Duration {
	now := time.Now()
	totalWaitDuration := scheduleTime.Sub(now)
	var requeueAfter time.Duration
	switch {
	case totalWaitDuration > 24*time.Hour:
		requeueAfter = 24 * time.Hour
	case totalWaitDuration > 6*time.Hour:
		requeueAfter = 6 * time.Hour
	case totalWaitDuration > 1*time.Hour:
		requeueAfter = 1 * time.Hour
	case totalWaitDuration > 10*time.Minute:
		requeueAfter = 10 * time.Minute
	default:
		requeueAfter = totalWaitDuration
	}
	if now.Add(requeueAfter).After(scheduleTime) {
		requeueAfter = totalWaitDuration
	}
	return requeueAfter
}

// SetupWithManager sets up the controller with the Manager.
func (r *DevBoxScheduleReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&devboxv1alpha1.DevBoxSchedule{}).
		Named("devboxschedule").
		Complete(r)
}
